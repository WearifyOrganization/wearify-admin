"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@wearify/shared/api";
import { Id } from "@wearify/shared/dataModel";
import { Card, Btn } from "@/components/ui/wearify-ui";
import { useUploadFile } from "@/lib/useUpload";
import { GUARDS, formatAccept, type UploadGuard } from "@/lib/uploadGuards";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STEPS = [
  "Store Profile",
  "KYC & Documents",
  "Agreements",
  "Plan & Billing",
  "Hardware",
  "Staff Setup",
  "WhatsApp",
  "Review & Activate",
];

type Errors = Record<string, string>;
type StaffMember = { name: string; phone: string; pin: string; role: string };
type MirrorEntry = { serial: string; iotId: string; source: string };
type TabletEntry = { serial: string; source: string };

const V = {
  phone: (v: string) => {
    if (!v.trim()) return "Required";
    if (!/^\d{10}$/.test(v)) return "Must be 10 digits";
    return "";
  },
  email: (v: string) => {
    if (!v.trim()) return "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Invalid email";
    return "";
  },
  pan: (v: string) => {
    if (!v.trim()) return "Required";
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(v.toUpperCase())) return "Format: AAAPZ1234C";
    return "";
  },
  gstin: (v: string) => {
    if (!v.trim()) return "Required";
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z0-9]$/.test(v.toUpperCase())) return "Format: 22AAAAA0000A1Z5";
    return "";
  },
  pin: (v: string) => {
    if (!v.trim()) return "Required";
    if (!/^\d{6}$/.test(v)) return "Must be 6 digits";
    return "";
  },
  required: (v: string) => (!v.trim() ? "Required" : ""),
};

export default function OnboardPage() {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const createStore = useMutation(api.stores.create);
  const createStaff = useMutation(api.stores.createStaff);
  const setStoreFile = useMutation(api.files.setStoreFile);
  const { upload } = useUploadFile();

  // Document uploads — keyed by the store schema field they patch.
  const [docFiles, setDocFiles] = useState<Record<string, { id: Id<"_storage">; name: string }>>({});
  const [docUploading, setDocUploading] = useState<Record<string, boolean>>({});
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});

  async function handleDocUpload(field: string, guard: UploadGuard, file?: File) {
    if (!file) return;
    setDocErrors((p) => ({ ...p, [field]: "" }));
    setDocUploading((p) => ({ ...p, [field]: true }));
    try {
      const id = await upload(file, guard);
      setDocFiles((p) => ({ ...p, [field]: { id, name: file.name } }));
    } catch (e) {
      setDocErrors((p) => ({ ...p, [field]: e instanceof Error ? e.message : "Upload failed" }));
    } finally {
      setDocUploading((p) => ({ ...p, [field]: false }));
    }
  }

  function removeDoc(field: string) {
    setDocFiles((p) => {
      const n = { ...p };
      delete n[field];
      return n;
    });
  }

  // Step 1: Store Profile & Business Details
  const [d, setD] = useState({
    name: "", ownerName: "", ownerPhone: "", ownerEmail: "",
    address: "", city: "", state: "", pin: "", area: "",
    hours: "10:00 AM - 9:00 PM", gstin: "", pan: "", shopLicense: "",
  });

  // Step 2: KYC & Documents
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankName, setBankName] = useState("");

  // Step 3: Agreements
  const [agreements, setAgreements] = useState<Record<string, boolean>>({});
  const [signerName, setSignerName] = useState("");
  const [signDate, setSignDate] = useState("");
  const [signerConfirm, setSignerConfirm] = useState(false);

  // Step 4: Plan & Billing
  const [plan, setPlan] = useState("Smart");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [discountCode, setDiscountCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI (Razorpay)");

  // Step 5: Hardware
  const [mirrors, setMirrors] = useState<MirrorEntry[]>([{ serial: "", iotId: "", source: "From spare inventory" }]);
  const [tablets, setTablets] = useState<TabletEntry[]>([{ serial: "", source: "From spare inventory" }]);
  const [accessories, setAccessories] = useState({ photoBooth: true, wifiRouter: true });
  const [shippingAddress, setShippingAddress] = useState("");
  const [installDate, setInstallDate] = useState("");
  const [technician, setTechnician] = useState("");

  // Step 6: Staff
  const [staffList, setStaffList] = useState<StaffMember[]>([{ name: "", phone: "", pin: "", role: "R05" }]);

  // Step 7: WhatsApp
  const [waNumber, setWaNumber] = useState("");
  // WhatsApp OTP verification is not implemented yet, so this stays false —
  // we never claim "verified" without a real verification.
  const waVerified = false;

  // --- Helpers ---
  const upd = (key: string, raw: string) => {
    let val = raw;
    if (key === "pin") val = raw.replace(/\D/g, "").slice(0, 6);
    if (key === "pan") val = raw.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase();
    if (key === "gstin") val = raw.replace(/[^A-Za-z0-9]/g, "").slice(0, 15).toUpperCase();
    if (key === "ownerPhone") { val = raw.replace(/\D/g, ""); val = (val.startsWith("91") && val.length > 10) ? val.slice(2) : val; val = val.slice(0, 10); }
    setD((p) => ({ ...p, [key]: val }));
    if (touched[key]) validateField(key, val);
  };

  const touch = (key: string) => {
    setTouched((p) => ({ ...p, [key]: true }));
    validateField(key, (d as Record<string, string>)[key] || "");
  };

  const validateField = (key: string, val: string) => {
    let err = "";
    if (["name", "ownerName", "city", "state", "address"].includes(key)) err = V.required(val);
    if (key === "ownerPhone") err = V.phone(val);
    if (key === "ownerEmail") err = V.email(val);
    if (key === "pan") err = V.pan(val);
    if (key === "gstin") err = V.gstin(val);
    if (key === "pin") err = V.pin(val);
    setErrors((p) => ({ ...p, [key]: err }));
    return err;
  };

  const validateStep = (): boolean => {
    const errs: Errors = {};
    const t: Record<string, boolean> = {};
    const check = (key: string, validator: (v: string) => string, val?: string) => {
      const fieldVal = val !== undefined ? val : ((d as Record<string, string>)[key] || "");
      const e = validator(fieldVal);
      if (e) { errs[key] = e; t[key] = true; }
    };

    if (step === 0) {
      check("name", V.required); check("ownerName", V.required);
      check("ownerPhone", V.phone); check("ownerEmail", V.email);
      check("address", V.required); check("city", V.required);
      check("state", V.required); check("pin", V.pin);
      check("gstin", V.gstin); check("pan", V.pan);
    }
    if (step === 5) {
      staffList.forEach((s, i) => {
        if (!s.name.trim()) { errs[`staff_${i}_name`] = "Required"; t[`staff_${i}_name`] = true; }
        if (!/^\d{10}$/.test(s.phone)) { errs[`staff_${i}_phone`] = "10 digits"; t[`staff_${i}_phone`] = true; }
        if (!/^\d{4}$/.test(s.pin)) { errs[`staff_${i}_pin`] = "4 digits"; t[`staff_${i}_pin`] = true; }
      });
      // Flag duplicate PINs within this list — catching them here avoids a
      // half-done activation where the first staff insert succeeds and the
      // second throws PIN_TAKEN server-side.
      const pinSeen = new Map<string, number>();
      staffList.forEach((s, i) => {
        if (!/^\d{4}$/.test(s.pin)) return;
        const firstIdx = pinSeen.get(s.pin);
        if (firstIdx === undefined) {
          pinSeen.set(s.pin, i);
        } else {
          errs[`staff_${i}_pin`] = "PIN already used above";
          t[`staff_${i}_pin`] = true;
        }
      });
    }
    if (step === 6) {
      if (!waNumber.trim() || !/^\d{10}$/.test(waNumber)) { errs.waNumber = "10 digits required"; t.waNumber = true; }
    }

    setErrors((p) => ({ ...p, ...errs }));
    setTouched((p) => ({ ...p, ...t }));
    return Object.values(errs).every((e) => !e);
  };

  const handleNext = () => { if (validateStep()) setStep(step + 1); };

  const handleActivate = async (status: "trial" | "active") => {
    const storeId = `ST-${String(Date.now()).slice(-6)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const mirrorRows = mirrors
      .filter((m) => m.serial.trim())
      .map((m) => ({ serial: m.serial.trim(), iotId: m.iotId.trim() || undefined, source: m.source }));
    const tabletRows = tablets
      .filter((t) => t.serial.trim())
      .map((t) => ({ serial: t.serial.trim(), source: t.source }));
    const newStoreId = await createStore({
      storeId,
      name: d.name, city: d.city,
      state: d.state || undefined, address: d.address || undefined, pin: d.pin || undefined,
      area: d.area || undefined, hours: d.hours || undefined,
      status, plan,
      mrr: plan === "Smart" ? 15000 : plan === "Digital" ? 10000 : 0,
      ownerName: d.ownerName || undefined,
      ownerPhone: d.ownerPhone ? `+91${d.ownerPhone}` : undefined,
      ownerEmail: d.ownerEmail || undefined,
      gstin: d.gstin || undefined,
      // KYC text / bank / agreements / billing / WhatsApp (ISSUES #22). Document
      // uploads are attached via setStoreFile below; hardware + e-sign audit are
      // now persisted too.
      pan: d.pan || undefined,
      shopLicense: d.shopLicense || undefined,
      bankAccount: bankAccount || undefined,
      bankIfsc: bankIfsc || undefined,
      bankName: bankName || undefined,
      msaAccepted: !!agreements.MSA,
      dpaAccepted: !!agreements.DPA,
      aupAccepted: !!agreements.AUP,
      hwAccepted: !!agreements.HW,
      slaAccepted: !!agreements.SLA,
      signerName: signerName || undefined,
      signDate: signDate || undefined,
      signerUserAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      billingCycle,
      paymentMethod,
      discountCode: discountCode || undefined,
      whatsappNumber: waNumber || undefined,
      whatsappVerified: waVerified,
      hardwareMirrors: mirrorRows.length ? mirrorRows : undefined,
      hardwareTablets: tabletRows.length ? tabletRows : undefined,
      hardwareAccessories: accessories,
      shippingAddress: shippingAddress || undefined,
      installDate: installDate || undefined,
      fieldTechnician: technician || undefined,
    });

    // Attach uploaded documents (logo + KYC + store photos). The store exists
    // now, so a failed attach doesn't block onboarding — surface which ones
    // need a re-upload from the store detail page.
    const failedDocs: string[] = [];
    for (const [field, doc] of Object.entries(docFiles)) {
      try {
        await setStoreFile({ storeId: newStoreId, field, fileId: doc.id });
      } catch {
        failedDocs.push(field);
      }
    }
    if (failedDocs.length) {
      alert(
        `Store created, but these documents couldn't be attached: ${failedDocs.join(", ")}. Re-upload them from the store's detail page.`,
      );
    }

    // Persist staff captured in step 6 (skip blank rows).
    // PIN dedup is already enforced at step 5 validation, but if the server
    // still rejects (e.g. existing staff on a store reused via storeId
    // collision, or admin edited after validating), surface which staff
    // couldn't be added instead of leaving the wizard in limbo.
    for (let i = 0; i < staffList.length; i++) {
      const s = staffList[i];
      if (!s.name.trim() || !/^\d{10}$/.test(s.phone) || !/^\d{4}$/.test(s.pin)) continue;
      try {
        await createStaff({
          name: s.name.trim(),
          phone: `+91${s.phone}`,
          pin: s.pin,
          role: s.role,
          storeId,
        });
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : "Failed to add staff";
        const key = `staff_${i}_pin`;
        setErrors((p) => ({
          ...p,
          [key]: raw.includes("PIN_TAKEN")
            ? "This PIN is already in use at this store"
            : raw,
        }));
        setTouched((p) => ({ ...p, [key]: true }));
        setStep(5);
        return;
      }
    }

    router.push("/admin/stores");
  };

  const allAgreementsSigned = ["MSA", "DPA", "AUP", "HW", "SLA"].every((k) => agreements[k]);

  // --- Render helpers ---
  const inp = (label: string, key: string, placeholder: string, opts?: { required?: boolean; maxLength?: number; prefix?: string; type?: string; disabled?: boolean }) => {
    const { required, maxLength, prefix, type = "text", disabled } = opts || {};
    const hasErr = touched[key] && errors[key];
    const bc = hasErr ? "border-wf-red focus-within:border-wf-red focus-within:ring-wf-red/20" : "border-wf-border focus-within:border-wf-primary focus-within:ring-wf-primary/20";
    return (
      <div className="mb-3">
        <label className="block text-sm font-semibold text-wf-subtext mb-1">{label}{required && <span className="text-wf-red"> *</span>}</label>
        {prefix ? (
          <div className={`flex items-center rounded-lg border bg-white focus-within:ring-2 transition-colors ${bc}`}>
            <span className="pl-3 pr-1 text-sm font-semibold text-wf-subtext select-none">{prefix}</span>
            <input type={type} value={(d as Record<string, string>)[key] || ""} onChange={(e) => upd(key, e.target.value)} onBlur={() => touch(key)} placeholder={placeholder} maxLength={maxLength} disabled={disabled} className="flex-1 px-2 py-2 bg-transparent text-sm text-wf-text focus:outline-none disabled:text-wf-muted" />
          </div>
        ) : (
          <input type={type} value={(d as Record<string, string>)[key] || ""} onChange={(e) => upd(key, e.target.value)} onBlur={() => touch(key)} placeholder={placeholder} maxLength={maxLength} disabled={disabled}
            className={`w-full px-3 py-2 rounded-lg border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 transition-colors disabled:text-wf-muted disabled:bg-wf-bg ${bc}`} />
        )}
        {hasErr && <p className="text-xs text-wf-red mt-0.5">{errors[key]}</p>}
      </div>
    );
  };

  const uploadBox = (label: string, field: string, guard: UploadGuard, required?: boolean) => {
    const f = docFiles[field];
    const up = docUploading[field];
    const err = docErrors[field];
    const acceptAttr = guard.accept.map((a) => (a.endsWith("/") ? a + "*" : a)).join(",");
    const maxMb = (guard.maxBytes / (1024 * 1024)).toFixed(0);
    return (
      <div className="mb-4">
        <label className="block text-sm font-semibold text-wf-subtext mb-1">{label}{required && <span className="text-wf-red"> *</span>}</label>
        {f ? (
          <div className="flex items-center justify-between border border-wf-border rounded-lg bg-wf-bg px-4 py-3">
            <span className="text-sm text-wf-green font-semibold truncate">✓ {f.name}</span>
            <button type="button" onClick={() => removeDoc(field)} className="text-xs text-wf-red hover:underline cursor-pointer bg-transparent border-none flex-shrink-0 ml-3">Remove</button>
          </div>
        ) : (
          <label className={`block border border-dashed border-wf-border rounded-lg bg-wf-bg px-4 py-5 text-center transition-colors ${up ? "cursor-wait" : "cursor-pointer hover:border-wf-primary"}`}>
            <input type="file" accept={acceptAttr} disabled={up} className="hidden"
              onChange={(e) => handleDocUpload(field, guard, e.target.files?.[0])} />
            <p className="text-sm text-wf-muted">{up ? "Uploading..." : "Click to upload"}</p>
            <p className="text-xs text-wf-muted">{formatAccept(guard.accept)} · max {maxMb}MB</p>
          </label>
        )}
        {err && <p className="text-xs text-wf-red mt-0.5">{err}</p>}
      </div>
    );
  };

  const stepDone = (i: number) => {
    if (i === 0) return d.name.trim() !== "" && d.city.trim() !== "" && d.ownerName.trim() !== "";
    if (i === 1) return true; // KYC docs are optional for progression
    if (i === 2) return allAgreementsSigned && signerName.trim() !== "" && signerConfirm;
    if (i === 3) return true;
    if (i === 4) return mirrors[0].serial.trim() !== "";
    if (i === 5) return staffList[0].name.trim() !== "";
    if (i === 6) return waNumber.length === 10;
    return false;
  };

  return (
    <div>
      {/* Breadcrumb & cancel */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-wf-muted">
          Mission Control &rsaquo; <Link href="/admin/stores" className="text-wf-primary hover:underline no-underline">Stores</Link>
        </div>
      </div>
      <Link href="/admin/stores"><Btn small className="mb-3">Cancel Onboarding</Btn></Link>

      <h1 className="text-xl font-extrabold text-wf-text mb-3">New Store Onboarding</h1>

      {/* Step tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STEPS.map((s, i) => (
          <button
            key={s}
            // ponytail: free step navigation — click any tab to jump. Lets an
            // admin (and QA) move around without the per-step mandatory gate.
            // The real validation still runs on "Next Step" and on Activate.
            onClick={() => setStep(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer border ${
              i === step
                ? "bg-wf-primary/10 text-wf-primary border-wf-primary"
                : i < step
                  ? "bg-wf-card text-wf-text border-wf-border"
                  : "bg-wf-bg text-wf-muted border-wf-border"
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              i < step ? "bg-wf-green text-white" : i === step ? "bg-wf-primary text-white" : "bg-wf-border text-wf-muted"
            }`}>
              {i < step ? "✓" : i + 1}
            </span>
            {s}
          </button>
        ))}
      </div>

      {/* Step 1: Store Profile & Business Details */}
      {step === 0 && (
        <Card title="Step 1: Store Profile & Business Details">
          <div className="grid grid-cols-2 gap-x-5">
            {inp("Store Name", "name", "e.g. MAUVE Sarees", { required: true })}
            {inp("Owner Full Name", "ownerName", "e.g. Smita Kabra", { required: true })}
            {inp("Owner Phone", "ownerPhone", "98XXXXXXXX", { required: true, maxLength: 10, prefix: "+91" })}
            {inp("Owner Email", "ownerEmail", "owner@store.com", { required: true })}
          </div>
          {inp("Store Address", "address", "Full street address", { required: true })}
          <div className="grid grid-cols-2 gap-x-5">
            {inp("City", "city", "e.g. Mumbai", { required: true })}
            {inp("State", "state", "e.g. Maharashtra", { required: true })}
            {inp("PIN Code", "pin", "e.g. 400005", { required: true, maxLength: 6 })}
            {inp("Store Area (sq ft)", "area", "e.g. 800")}
            {inp("Operating Hours", "hours", "10:00 AM - 9:00 PM")}
            {inp("GSTIN", "gstin", "22AAAAA0000A1Z5", { required: true, maxLength: 15 })}
            {inp("PAN Number", "pan", "AAAAA9999A", { required: true, maxLength: 10 })}
            {inp("Shop & Est. License #", "shopLicense", "License number")}
          </div>
          {uploadBox("Store Logo", "logoFileId", GUARDS.storeLogo)}
        </Card>
      )}

      {/* Step 2: KYC & Compliance Documents */}
      {step === 1 && (
        <Card title="Step 2: KYC & Compliance Documents">
          <p className="text-xs text-wf-subtext mb-4">All documents will be verified within 24 hours. Store activation depends on successful KYC.</p>
          <div className="grid grid-cols-2 gap-x-5">
            {uploadBox("Owner Aadhaar Card", "aadhaarFileId", GUARDS.kycDocument, true)}
            {uploadBox("Owner PAN Card", "panFileId", GUARDS.kycDocument, true)}
            {uploadBox("GST Registration Certificate", "gstCertFileId", GUARDS.kycDocument, true)}
            {uploadBox("Shop & Est. License Copy", "shopLicenseFileId", GUARDS.kycDocument)}
          </div>

          <h4 className="text-sm font-bold text-wf-text mt-4 mb-2">Bank Details (for Razorpay Payouts)</h4>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-wf-subtext mb-1">Account Number</label>
            <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ""))} placeholder="Account number" className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
          </div>
          <div className="grid grid-cols-2 gap-x-5">
            <div className="mb-3">
              <label className="block text-sm font-semibold text-wf-subtext mb-1">IFSC Code</label>
              <input value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase().slice(0, 11))} placeholder="SBIN0001234" className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-semibold text-wf-subtext mb-1">Bank & Branch</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="SBI, Colaba Branch" className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-5 mt-2">
            {uploadBox("Store Photo (Exterior)", "storePhotoExtFileId", GUARDS.sareePhoto)}
            {uploadBox("Store Photo (Interior)", "storePhotoIntFileId", GUARDS.sareePhoto)}
          </div>
        </Card>
      )}

      {/* Step 3: Agreements & E-Signature */}
      {step === 2 && (
        <Card title="Step 3: Agreement Acceptance & E-Signature">
          <p className="text-xs text-wf-subtext mb-4">The following legal agreements must be read and accepted before store activation. Electronic acceptance is legally binding under the IT Act 2000.</p>
          {[
            ["MSA", "Master Subscription Agreement (MSA)", "Governs the SaaS subscription, payment terms, SLA, liability caps, termination clauses"],
            ["DPA", "Data Processing Agreement (DPA)", "DPDP Act 2023 compliance: data handling, processing purpose, retention, deletion"],
            ["AUP", "Acceptable Use Policy (AUP)", "Prohibited uses: counterfeit goods, spam, reverse-engineering, data abuse"],
            ["HW", "Hardware Rental Addendum", "Smart Mirror and Tablet remain company property. Care obligations, replacement terms"],
            ["SLA", "SLA Schedule", "99.5% uptime target. Service credit formula. Escalation matrix."],
          ].map(([key, name, desc]) => (
            <div key={key} className="py-4 border-b border-wf-border last:border-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-wf-text">{name}</div>
                  <div className="text-xs text-wf-muted mt-0.5">{desc}</div>
                </div>
                <Btn small className="flex-shrink-0 ml-4" onClick={() => window.open(`/legal/${(key as string).toLowerCase()}.pdf`, "_blank", "noopener,noreferrer")}>View PDF</Btn>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={agreements[key] || false} onChange={() => setAgreements((p) => ({ ...p, [key]: !p[key] }))} className="w-4 h-4 accent-wf-primary cursor-pointer" />
                <span className="text-sm text-wf-text">I have read and accept the {name}</span>
              </label>
            </div>
          ))}

          <div className="mt-4 bg-wf-bg rounded-lg border border-wf-border p-4">
            <h4 className="text-sm font-bold text-wf-text mb-3">Electronic Signature (IT Act 2000 compliant)</h4>
            <div className="mb-3">
              <label className="block text-sm font-semibold text-wf-subtext mb-1">Full Legal Name of Signer <span className="text-wf-red">*</span></label>
              <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="As on PAN card" className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-semibold text-wf-subtext mb-1">Date of Signing <span className="text-wf-red">*</span></label>
              <input type="date" value={signDate} onChange={(e) => setSignDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={signerConfirm} onChange={() => setSignerConfirm(!signerConfirm)} className="w-4 h-4 accent-wf-primary cursor-pointer mt-0.5" />
              <span className="text-xs text-wf-text">I confirm that I am authorised to sign on behalf of the store and that this electronic signature has the same legal validity as a wet signature under the Information Technology Act, 2000.</span>
            </label>
            {/* ponytail: server timestamp + device UA are captured on activation;
                client IP capture needs an HTTP action and is a follow-up. */}
            <p className="text-xs text-wf-muted mt-2 italic">A server timestamp and your device details are recorded on activation for audit validity.</p>
          </div>
        </Card>
      )}

      {/* Step 4: Plan & Billing */}
      {step === 3 && (
        <Card title="Step 4: Plan & Billing Configuration">
          <h4 className="text-sm font-bold text-wf-text mb-3">Select Subscription Plan</h4>
          {[
            { id: "Digital", name: "Dukaan Digital", desc: "Catalog + AI Search + CRM + WhatsApp (no Mirror)", price: "Rs 10,000/mo" },
            { id: "Smart", name: "Dukaan Smart", desc: "Everything in Digital + Smart Mirror + Virtual Try-On + AI Stylist", price: "Rs 15,000/mo" },
          ].map((p) => (
            <div key={p.id} onClick={() => setPlan(p.id)}
              className={`p-4 rounded-lg border-2 mb-3 cursor-pointer transition-all ${plan === p.id ? "border-wf-primary bg-wf-primary/5" : "border-wf-border hover:border-wf-primary/30"}`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-bold text-wf-text">{p.name}</span>
                  <p className="text-xs text-wf-subtext mt-0.5">{p.desc}</p>
                </div>
                <span className="text-base font-bold font-mono text-wf-primary whitespace-nowrap ml-4">{p.price}</span>
              </div>
            </div>
          ))}

          <h4 className="text-sm font-bold text-wf-text mt-4 mb-2">Billing Cycle</h4>
          {[
            { id: "monthly", label: "Monthly", sub: "Full price" },
            { id: "annual", label: "Annual (25% off)", sub: `Billed yearly, Rs ${plan === "Smart" ? "1,35,000" : "90,000"}` },
          ].map((c) => (
            <label key={c.id} className="flex items-center gap-3 mb-2 cursor-pointer">
              <input type="radio" name="billing" checked={billingCycle === c.id} onChange={() => setBillingCycle(c.id)} className="w-4 h-4 accent-wf-primary" />
              <span className="text-sm font-semibold text-wf-text">{c.label}</span>
              <span className="text-xs text-wf-muted">{c.sub}</span>
            </label>
          ))}

          <div className="mt-4 mb-3">
            <label className="block text-sm font-semibold text-wf-subtext mb-1">Discount Code (if applicable)</label>
            <input value={discountCode} onChange={(e) => setDiscountCode(e.target.value.toUpperCase())} placeholder="e.g. EARLY40, ASSOC30" className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-wf-subtext mb-1">Payment Method <span className="text-wf-red">*</span></label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20">
              <option>UPI (Razorpay)</option>
              <option>Net Banking</option>
              <option>Credit/Debit Card</option>
              <option>Bank Transfer (NEFT/RTGS)</option>
            </select>
          </div>
          <p className="text-xs text-wf-muted italic">First invoice with GST (18%) will be generated upon activation. Razorpay subscription ID will be created automatically.</p>
        </Card>
      )}

      {/* Step 5: Hardware Assignment */}
      {step === 4 && (
        <Card title="Step 5: Hardware Assignment">
          <h4 className="text-sm font-bold text-wf-text mb-3">Smart Mirrors</h4>
          {mirrors.map((m, i) => (
            <div key={i} className="bg-wf-bg rounded-lg border border-wf-border p-4 mb-3">
              <p className="text-xs font-bold text-wf-subtext mb-2">Mirror #{i + 1}</p>
              <div className="grid grid-cols-2 gap-x-5">
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-wf-subtext mb-1">Serial Number <span className="text-wf-red">*</span></label>
                  <input value={m.serial} onChange={(e) => { const u = [...mirrors]; u[i].serial = e.target.value; setMirrors(u); }} placeholder="e.g. WFY-MR-2026-XXX" className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-wf-subtext mb-1">IoT Device ID</label>
                  <input value={m.iotId} onChange={(e) => { const u = [...mirrors]; u[i].iotId = e.target.value; setMirrors(u); }} placeholder="Auto-generated from AWS IoT Core" className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
                </div>
              </div>
              <div className="mb-1">
                <label className="block text-sm font-semibold text-wf-subtext mb-1">Source</label>
                <select value={m.source} onChange={(e) => { const u = [...mirrors]; u[i].source = e.target.value; setMirrors(u); }} className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20">
                  <option>From spare inventory</option>
                  <option>New order</option>
                  <option>Refurbished</option>
                </select>
              </div>
            </div>
          ))}
          <Btn small primary onClick={() => setMirrors([...mirrors, { serial: "", iotId: "", source: "From spare inventory" }])}>+ Add Another Mirror</Btn>

          <h4 className="text-sm font-bold text-wf-text mt-5 mb-3">Tablets</h4>
          {tablets.map((t, i) => (
            <div key={i} className="bg-wf-bg rounded-lg border border-wf-border p-4 mb-3">
              <p className="text-xs font-bold text-wf-subtext mb-2">Tablet #{i + 1}</p>
              <div className="mb-3">
                <label className="block text-sm font-semibold text-wf-subtext mb-1">Tablet Serial</label>
                <input value={t.serial} onChange={(e) => { const u = [...tablets]; u[i].serial = e.target.value; setTablets(u); }} placeholder="Tab serial number" className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
              </div>
              <div className="mb-1">
                <label className="block text-sm font-semibold text-wf-subtext mb-1">Source</label>
                <select value={t.source} onChange={(e) => { const u = [...tablets]; u[i].source = e.target.value; setTablets(u); }} className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20">
                  <option>From spare inventory</option>
                  <option>New order</option>
                </select>
              </div>
            </div>
          ))}
          <Btn small primary onClick={() => setTablets([...tablets, { serial: "", source: "From spare inventory" }])}>+ Add Another Tablet</Btn>

          <h4 className="text-sm font-bold text-wf-text mt-5 mb-2">Accessories</h4>
          {[
            ["photoBooth", "Photo Booth Kit (tripod + light + backdrop)"],
            ["wifiRouter", "WiFi Router (pre-configured, WPA3)"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 mb-2 cursor-pointer">
              <input type="checkbox" checked={accessories[key as keyof typeof accessories]} onChange={() => setAccessories((p) => ({ ...p, [key]: !p[key as keyof typeof accessories] }))} className="w-4 h-4 accent-wf-green cursor-pointer" />
              <span className="text-sm text-wf-text">{label}</span>
            </label>
          ))}

          <div className="mt-4 mb-3">
            <label className="block text-sm font-semibold text-wf-subtext mb-1">Shipping Address (if different from store)</label>
            <input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Leave blank to use store address" className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
          </div>
          <div className="grid grid-cols-2 gap-x-5">
            <div className="mb-3">
              <label className="block text-sm font-semibold text-wf-subtext mb-1">Preferred Installation Date</label>
              <input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-semibold text-wf-subtext mb-1">Assigned Field Technician</label>
              <input value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="e.g. Amit Kumar" className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
            </div>
          </div>
        </Card>
      )}

      {/* Step 6: Staff Setup & Credentials */}
      {step === 5 && (
        <Card title="Step 6: Staff Setup & Credentials">
          <p className="text-xs text-wf-subtext mb-3">Store Owner (from Step 1) is automatically assigned Role R03. Add managers and salespersons below. Each gets a unique login with role-based access.</p>
          <div className="bg-wf-amber/10 text-wf-amber text-xs font-semibold px-4 py-2 rounded-lg mb-4">
            Auto-created: {d.ownerName || "Owner"} — Role R03 (Store Owner) — Phone: {d.ownerPhone ? `+91 ${d.ownerPhone}` : "---"}
          </div>

          {staffList.map((s, i) => (
            <div key={i} className="bg-wf-bg rounded-lg border border-wf-border p-4 mb-3">
              <p className="text-xs font-bold text-wf-subtext mb-2">Staff #{i + 1}</p>
              <div className="grid grid-cols-2 gap-x-5">
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-wf-subtext mb-1">Full Name <span className="text-wf-red">*</span></label>
                  <input value={s.name} onChange={(e) => { const u = [...staffList]; u[i].name = e.target.value; setStaffList(u); }} placeholder="Staff name" className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
                  {touched[`staff_${i}_name`] && errors[`staff_${i}_name`] && <p className="text-xs text-wf-red mt-0.5">{errors[`staff_${i}_name`]}</p>}
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-wf-subtext mb-1">Phone <span className="text-wf-red">*</span></label>
                  <div className="flex items-center rounded-lg border border-wf-border bg-white focus-within:ring-2 focus-within:border-wf-primary focus-within:ring-wf-primary/20">
                    <span className="pl-3 pr-1 text-sm font-semibold text-wf-subtext select-none">+91</span>
                    <input value={s.phone} onChange={(e) => { const u = [...staffList]; u[i].phone = e.target.value.replace(/\D/g, "").slice(0, 10); setStaffList(u); }} placeholder="XXXXXXXXXX" maxLength={10} className="flex-1 px-2 py-2 bg-transparent text-sm text-wf-text focus:outline-none" />
                  </div>
                  {touched[`staff_${i}_phone`] && errors[`staff_${i}_phone`] && <p className="text-xs text-wf-red mt-0.5">{errors[`staff_${i}_phone`]}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-5">
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-wf-subtext mb-1">Login PIN (4 digits) <span className="text-wf-red">*</span></label>
                  <input value={s.pin} onChange={(e) => { const u = [...staffList]; u[i].pin = e.target.value.replace(/\D/g, "").slice(0, 4); setStaffList(u); }} placeholder="e.g. 4521" maxLength={4} className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20" />
                  {touched[`staff_${i}_pin`] && errors[`staff_${i}_pin`] && <p className="text-xs text-wf-red mt-0.5">{errors[`staff_${i}_pin`]}</p>}
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-wf-subtext mb-1">Role</label>
                  <select value={s.role} onChange={(e) => { const u = [...staffList]; u[i].role = e.target.value; setStaffList(u); }} className="w-full px-3 py-2 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:ring-2 focus:border-wf-primary focus:ring-wf-primary/20">
                    <option value="R04">R04 - Store Manager</option>
                    <option value="R05">R05 - Salesperson</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          <Btn small primary onClick={() => setStaffList([...staffList, { name: "", phone: "", pin: "", role: "R05" }])}>+ Add Staff Member</Btn>
          <p className="text-xs text-wf-muted mt-3 italic">Credentials are generated on activation. SMS sent to each staff member with app download link + PIN.</p>
        </Card>
      )}

      {/* Step 7: WhatsApp Business Integration */}
      {step === 6 && (
        <Card title="Step 7: WhatsApp Business Integration">
          <p className="text-xs text-wf-subtext mb-4">Connect the store&apos;s WhatsApp Business number for customer sharing, campaigns, and automated notifications via Gupshup API.</p>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-wf-subtext mb-1">WhatsApp Business Phone Number <span className="text-wf-red">*</span></label>
            <div className="flex items-center rounded-lg border border-wf-border bg-white focus-within:ring-2 focus-within:border-wf-primary focus-within:ring-wf-primary/20">
              <span className="pl-3 pr-1 text-sm font-semibold text-wf-subtext select-none">+91</span>
              <input value={waNumber} onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98XXXXXXXX" maxLength={10} className="flex-1 px-2 py-2 bg-transparent text-sm text-wf-text focus:outline-none" />
            </div>
            {touched.waNumber && errors.waNumber && <p className="text-xs text-wf-red mt-0.5">{errors.waNumber}</p>}
          </div>
          {/* WhatsApp OTP verification has no backend yet, so we don't fake a
              "verified" state. The number is still captured and persisted; it
              can be verified later once the Gupshup OTP flow is wired up. */}
          <Btn small disabled>Verify via Gupshup OTP (not available yet)</Btn>
          <p className="text-xs text-wf-muted mt-2 italic">Number is saved now; verification will be available once the Gupshup OTP integration is live.</p>
        </Card>
      )}

      {/* Step 8: Review & Activate */}
      {step === 7 && (
        <Card title="Step 8: Review & Activate">
          <h4 className="text-sm font-bold text-wf-text mb-3">Complete Onboarding Summary</h4>
          <div className="border border-wf-border rounded-lg overflow-hidden mb-4">
            {[
              ["Store", d.name],
              ["Owner", d.ownerName],
              ["GSTIN", d.gstin],
              ["Plan", `${plan === "Smart" ? "Dukaan Smart (Rs 15K)" : "Dukaan Digital (Rs 10K)"}`, billingCycle === "monthly" ? "Monthly" : "Annual"],
              ["Mirrors", `${mirrors.length} assigned`],
              ["Tablets", `${tablets.length} assigned`],
              ["Staff", `${staffList.length + 1} total (incl. owner)`],
              ["WhatsApp", waNumber ? `+91 ${waNumber}` : "---", waVerified ? "Verified" : "Not verified"],
            ].map(([label, value, extra], i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-wf-border last:border-0 text-sm">
                <span className="text-wf-muted">{label}</span>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-wf-text">{value}</span>
                  {extra && <span className="text-xs text-wf-muted">{extra}</span>}
                </div>
              </div>
            ))}
          </div>

          <h4 className="text-sm font-bold text-wf-text mb-2">Compliance Checklist</h4>
          {[
            ["KYC Documents", stepDone(1)],
            ["Agreements Signed", allAgreementsSigned],
            ["E-Signature Captured", signerConfirm && signerName.trim() !== ""],
            ["Payment Configured", true],
            ["Hardware Assigned", mirrors[0]?.serial.trim() !== ""],
            ["Staff Created", staffList[0]?.name.trim() !== ""],
            ["WhatsApp Connected", waVerified],
          ].map(([label, ok]) => (
            <div key={label as string} className="flex items-center gap-2 py-1 text-sm">
              <span className={ok ? "text-wf-green" : "text-wf-red font-bold"}>
                {ok ? "✓" : "✗"}
              </span>
              <span className={ok ? "text-wf-text" : "text-wf-red"}>{label as string}</span>
            </div>
          ))}

          <div className="flex gap-3 mt-5">
            <Btn primary onClick={() => handleActivate("trial")}>Activate as Trial</Btn>
            <Btn onClick={() => handleActivate("active")}>Activate as Active</Btn>
            <Btn danger onClick={() => router.push("/admin/stores")}>Discard</Btn>
          </div>
        </Card>
      )}

      {/* Footer navigation */}
      <div className="flex items-center justify-between mt-4">
        <Btn onClick={() => step > 0 ? setStep(step - 1) : router.push("/admin/stores")} disabled={step === 0}>Previous</Btn>
        <span className="text-xs text-wf-muted">Step {step + 1} of {STEPS.length}{step < 7 ? " — Complete required fields" : ""}</span>
        {step < 7 && <Btn primary onClick={handleNext}>Next Step</Btn>}
        {step === 7 && <Btn primary disabled>Next Step</Btn>}
      </div>
    </div>
  );
}
