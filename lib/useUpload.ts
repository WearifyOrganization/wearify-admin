"use client";

import { useMutation } from "convex/react";
import * as Sentry from "@sentry/nextjs";
import { api } from "@wearify/shared/api";
import { Id } from "@wearify/shared/dataModel";
import { assertFileClient, type UploadGuard } from "./uploadGuards";
import { getToken } from "./phoneAuth";

/**
 * Hook for uploading files to Convex storage.
 *
 * Pass an optional `guard` to enforce size + MIME limits before the upload
 * is sent. This is a UX convenience (fast failure, no wasted bandwidth);
 * the real security boundary lives on the server via convex/fileValidation.
 *
 * `generateUploadUrl` is authorized server-side, so every upload must carry a
 * credential. The web session token (getToken) is resolved here automatically;
 * device-backed surfaces (the kiosk) pass their `deviceToken` — either once via
 * the hook's `auth` arg, or per-call as the third `upload()` arg. Per-call auth
 * wins, then hook auth, then the ambient web token.
 *
 * TRACING: an upload is two round trips — authorize, then ship the bytes — and
 * "the upload is slow" is unactionable until you know which one. The parent
 * span carries the size so a slow store's traces can be read against what it
 * was actually sending, and the file NAME is never an attribute (customers
 * photograph themselves; filenames leak).
 */
export function useUploadFile(auth?: { token?: string; deviceToken?: string }) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  async function upload(
    file: File,
    guard?: UploadGuard,
    callAuth?: { token?: string; deviceToken?: string },
  ): Promise<Id<"_storage">> {
    if (guard) assertFileClient(file, guard);

    return Sentry.startSpan(
      {
        name: "upload.file",
        op: "file.upload",
        attributes: { "file.size": file.size, "file.type": file.type },
      },
      async (span) => {
        const url = await Sentry.startSpan(
          { name: "upload.authorize", op: "db.convex.mutation" },
          () =>
            generateUploadUrl({
              token: callAuth?.token ?? auth?.token ?? getToken() ?? undefined,
              deviceToken: callAuth?.deviceToken ?? auth?.deviceToken ?? undefined,
            }),
        );

        const result = await Sentry.startSpan(
          { name: "upload.transfer", op: "http.client" },
          () =>
            fetch(url, {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            }),
        );

        if (!result.ok) {
          // startSpan marks the span errored when the callback throws, so the
          // only thing worth adding by hand is the status that explains it.
          span.setAttribute("http.response.status_code", result.status);
          throw new Error(`Upload failed: ${result.statusText}`);
        }

        Sentry.metrics.distribution("upload.bytes", file.size, {
          unit: "byte",
          attributes: { type: file.type },
        });

        const { storageId } = await result.json();
        return storageId as Id<"_storage">;
      },
    );
  }

  return { upload };
}
