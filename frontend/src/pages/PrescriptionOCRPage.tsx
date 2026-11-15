import React, { useState } from 'react';
import {
  FileScan, UploadCloud, CheckCircle2, AlertTriangle, ArrowRight,
  Sparkles, FileText, ShieldAlert, Edit3, Check
} from 'lucide-react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';

export const PrescriptionOCRPage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [editableMeds, setEditableMeds] = useState<any[]>([]);
  const [activatedSuccess, setActivatedSuccess] = useState(false);

  const handleFileUpload = async (uploadFile: File) => {
    setFile(uploadFile);
    setIsScanning(true);
    setOcrResult(null);
    setActivatedSuccess(false);

    try {
      const data = await api.ocr.upload(uploadFile);
      setOcrResult(data);
      setEditableMeds(data.extracted_medications || []);
    } catch (err: any) {
      alert(err.message || "Failed to scan prescription");
    } finally {
      setIsScanning(false);
    }
  };

  // Mock file generator for sample prescriptions
  const handleSampleSelect = (type: 'diabetes' | 'cardio') => {
    const filename = type === 'diabetes' ? 'metformin_diabetes_rx.pdf' : 'cardio_bp_rx.png';
    const blob = new Blob(["Sample Prescription Document Content"], { type: 'application/pdf' });
    const mockFile = new File([blob], filename, { type: 'application/pdf' });
    handleFileUpload(mockFile);
  };

  const handleActivateMedication = async (med: any) => {
    try {
      await api.ocr.activateDraft(med);
      setActivatedSuccess(true);
      setTimeout(() => {
        navigate('/my-medicines');
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Failed to activate medication");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-ivory-200 dark:border-navy-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 text-careteal-700 dark:text-careteal-400 font-bold text-xs uppercase tracking-wider mb-1">
            <FileScan className="w-4 h-4" />
            <span>Intelligent Document Extraction</span>
          </div>
          <h1 className="text-3xl font-extrabold text-navy-800 dark:text-white">
            Prescription OCR Scanner
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Scan paper prescriptions or PDFs. Extract medicines, dosages, and schedules with mandatory human-in-the-loop verification.
          </p>
        </div>

        {/* Quick Demo Samples */}
        <div className="flex items-center gap-2 bg-ivory-100 p-2 rounded-2xl border border-ivory-300">
          <span className="text-xs font-bold text-slate-500 px-2 uppercase">Quick Demo:</span>
          <button
            onClick={() => handleSampleSelect('diabetes')}
            className="px-3 py-1.5 rounded-xl bg-white text-xs font-bold text-careteal-800 shadow-sm hover:bg-careteal-50"
          >
            Diabetes Rx
          </button>
          <button
            onClick={() => handleSampleSelect('cardio')}
            className="px-3 py-1.5 rounded-xl bg-white text-xs font-bold text-careteal-800 shadow-sm hover:bg-careteal-50"
          >
            Cardio Rx
          </button>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div className="bg-white dark:bg-navy-900 rounded-3xl p-8 sm:p-12 border-2 border-dashed border-careteal-300 dark:border-navy-700 shadow-sm text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-careteal-50 dark:bg-navy-800 text-careteal-700 dark:text-careteal-300 flex items-center justify-center mx-auto shadow-inner">
          <UploadCloud className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-navy-800 dark:text-white">
            Upload Prescription Image or PDF
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Supports PNG, JPG, JPEG, and PDF documents. Tesseract OCR will parse medications and dosages.
          </p>
        </div>

        <input
          type="file"
          id="prescription-file-input"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        />
        <label
          htmlFor="prescription-file-input"
          className="inline-block px-8 py-3.5 rounded-2xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-sm cursor-pointer shadow-md transition-all hover:scale-105"
        >
          {isScanning ? 'Processing OCR...' : 'Select File to Scan'}
        </label>
      </div>

      {/* Loading Skeleton */}
      {isScanning && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3 animate-pulse">
          <div className="w-8 h-8 border-4 border-careteal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="font-bold text-navy-800">Reading prescription with Tesseract OCR engine...</div>
          <div className="text-xs text-slate-400">Detecting doctor name, dosages, frequencies, and instructions</div>
        </div>
      )}

      {/* OCR Results & Human-in-the-Loop Editable Confirmation Form */}
      {ocrResult && (
        <div className="space-y-6">
          {/* Important Security / Verification Notice */}
          <div className="bg-amber-50 dark:bg-navy-900 border-2 border-amber-300 dark:border-amber-700 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
            <ShieldAlert className="w-7 h-7 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-base font-bold text-amber-900 dark:text-amber-300">
                Mandatory Human-in-the-Loop Verification
              </h4>
              <p className="text-sm text-amber-800 dark:text-slate-300">
                {ocrResult.verification_notice} <strong>Never automatically activate a medication without reviewing.</strong>
              </p>
              <div className="flex items-center gap-4 text-xs font-semibold pt-2 text-slate-600">
                <span>OCR Confidence Score: <strong>{Math.round(ocrResult.confidence_score * 100)}%</strong></span>
                <span>Doctor on Rx: <strong>{ocrResult.doctor_name}</strong></span>
                <span>Date: <strong>{ocrResult.prescription_date}</strong></span>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {activatedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-800 font-bold text-center border border-emerald-300 animate-bounce">
              ✓ Medication verified and activated into your schedule! Redirecting to My Medicines...
            </div>
          )}

          {/* Extracted Candidates Form */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-navy-800 dark:text-white">
              Editable Confirmation Form ({editableMeds.length} detected)
            </h3>

            {editableMeds.map((med, index) => (
              <div
                key={index}
                className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-careteal-600" />
                    <h4 className="text-lg font-bold text-navy-800 dark:text-white">
                      Medication #{index + 1}
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    Match Confidence: {Math.round(med.confidence * 100)}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Medication Name</label>
                    <input
                      type="text"
                      value={med.name}
                      onChange={e => {
                        const copy = [...editableMeds];
                        copy[index].name = e.target.value;
                        setEditableMeds(copy);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-navy-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dosage Strength</label>
                    <input
                      type="text"
                      value={med.dosage_strength}
                      onChange={e => {
                        const copy = [...editableMeds];
                        copy[index].dosage_strength = e.target.value;
                        setEditableMeds(copy);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-navy-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frequency</label>
                    <select
                      value={med.frequency_type}
                      onChange={e => {
                        const copy = [...editableMeds];
                        copy[index].frequency_type = e.target.value;
                        setEditableMeds(copy);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-navy-800 bg-white"
                    >
                      <option value="daily">Once Daily</option>
                      <option value="twice_daily">Twice Daily (BID)</option>
                      <option value="thrice_daily">Three Times Daily (TID)</option>
                      <option value="as_needed">As Needed (PRN)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instructions</label>
                  <input
                    type="text"
                    value={med.instructions}
                    onChange={e => {
                      const copy = [...editableMeds];
                      copy[index].instructions = e.target.value;
                      setEditableMeds(copy);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-700"
                  />
                </div>

                {/* Confirm and Activate Action */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Review values above before adding to active schedule.
                  </div>
                  <button
                    onClick={() => handleActivateMedication(med)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-sm shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>Verify & Add to My Schedule</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Raw Text Toggle for Full Transparency */}
          <details className="bg-ivory-50 dark:bg-navy-900 p-6 rounded-3xl border border-ivory-300 dark:border-navy-800 text-xs text-slate-600">
            <summary className="font-bold cursor-pointer text-slate-700">View Raw OCR Extracted Text</summary>
            <pre className="mt-3 whitespace-pre-wrap font-mono p-4 bg-white dark:bg-navy-800 rounded-xl border border-slate-200">
              {ocrResult.raw_text}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};
