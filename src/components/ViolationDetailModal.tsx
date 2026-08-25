import React, { useState } from 'react';
import { ViolationRecord } from '../types';
import {
  X,
  ShieldAlert,
  Sparkles,
  Printer,
  CheckCircle2,
  XCircle,
  FileCheck,
  AlertTriangle,
  Scale,
  DollarSign,
  Info,
} from 'lucide-react';

interface ViolationDetailModalProps {
  violation: ViolationRecord | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: ViolationRecord['status']) => void;
}

export const ViolationDetailModal: React.FC<ViolationDetailModalProps> = ({
  violation,
  onClose,
  onUpdateStatus,
}) => {
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<ViolationRecord['aiAnalysis'] | null>(
    violation?.aiAnalysis || null
  );

  if (!violation) return null;

  const handleGenerateAiChallan = async () => {
    setIsGeneratingAi(true);
    try {
      const response = await fetch('/api/gemini/analyze-violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: violation.trackId,
          violationType: violation.type,
          vehicleType: violation.vehicleType,
          speedKmh: violation.speedKmh,
          speedLimit: violation.speedLimit,
          plateNumber: violation.plateNumber,
          timestamp: violation.timestamp,
          location: violation.location,
          severity: violation.severity,
          ruleDetails: violation.ruleDetails,
          snapshotBase64: violation.snapshotUrl,
        }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        setAiAnalysis(result.data);
        onUpdateStatus(violation.id, 'CHALLAN_ISSUED');
      }
    } catch (err) {
      console.error('Failed to generate AI analysis:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 text-slate-100 shadow-2xl relative my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Incident Evidence & E-Challan Dossier
                </h2>
                <span className="bg-slate-800 text-sky-400 font-mono text-xs px-2 py-0.5 rounded border border-slate-700">
                  {violation.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logged at {violation.formattedTime} • {violation.location}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-6">
          {/* Left Column: Evidence Photo & Telemetry (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            {/* Snapshot Frame */}
            <div className="bg-slate-950 rounded-xl border border-slate-700 overflow-hidden shadow-inner flex flex-col">
              <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-300">
                <span>EVIDENCE PHOTO #1</span>
                <span className="text-amber-400 font-bold">{violation.type}</span>
              </div>
              <div className="aspect-[16/10] bg-slate-950 flex items-center justify-center relative">
                {violation.snapshotUrl ? (
                  <img
                    src={violation.snapshotUrl}
                    alt="Violation Evidence"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-xs text-slate-500">NO SNAPSHOT</div>
                )}
              </div>
            </div>

            {/* Telemetry Details */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 text-xs space-y-2">
              <h4 className="font-bold text-white mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-400" />
                Optical Telemetry Snapshot
              </h4>

              <div className="flex justify-between py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Vehicle Target ID:</span>
                <span className="font-mono font-bold text-sky-400">
                  #{violation.trackId} ({violation.vehicleType})
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-700/60">
                <span className="text-slate-400">License Plate:</span>
                <span className="font-mono font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                  {violation.plateNumber}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Estimated Speed:</span>
                <span className="font-mono font-bold text-amber-300">
                  {violation.speedKmh} km/h (Limit: {violation.speedLimit} km/h)
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Severity Flag:</span>
                <span className="font-bold text-red-400">{violation.severity}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-400">CV Confidence:</span>
                <span className="font-mono text-emerald-400">
                  {(violation.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Rule Trigger Log */}
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/80 text-xs">
              <h5 className="font-bold text-slate-200 mb-1">
                Rule Engine Trigger: {violation.ruleDetails?.metricName}
              </h5>
              <p className="text-slate-300 font-mono text-[11px] text-amber-300">
                Measured: {violation.ruleDetails?.metricValue}
              </p>
              <p className="text-slate-400 text-[10px] mt-1">
                {violation.ruleDetails?.reason}
              </p>
            </div>
          </div>

          {/* Right Column: AI E-Challan & Enforcement Assessment (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-850 p-5 rounded-2xl border border-slate-700 shadow-xl flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">
                      Automated AI E-Challan & Legal Citation
                    </h3>
                  </div>
                  {!aiAnalysis && (
                    <button
                      id="btn-trigger-gemini-challan"
                      onClick={handleGenerateAiChallan}
                      disabled={isGeneratingAi}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isGeneratingAi ? (
                        <>
                          <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                          Gemini 3.7 Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate E-Challan
                        </>
                      )}
                    </button>
                  )}
                </div>

                {aiAnalysis ? (
                  <div className="space-y-4 text-xs animate-fadeIn">
                    {/* Challan Badge & Fine */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          Official E-Challan ID
                        </span>
                        <div className="text-sm font-mono font-bold text-sky-400 mt-0.5">
                          {aiAnalysis.challanNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {aiAnalysis.legalSection}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          Statutory Penalty Fine
                        </span>
                        <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                          ₹{aiAnalysis.penaltyFineAmount || 1500} / $
                          {Math.round((aiAnalysis.penaltyFineAmount || 1500) / 80)}
                        </div>
                        <div className="text-[10px] text-rose-400 font-semibold mt-0.5">
                          Risk: {aiAnalysis.riskRating}
                        </div>
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <div>
                      <h5 className="font-bold text-slate-200 mb-1 flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5 text-indigo-400" />
                        Executive Legal Assessment
                      </h5>
                      <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                        {aiAnalysis.executiveSummary}
                      </p>
                    </div>

                    {/* Evidence & Corrective Action */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <h6 className="font-bold text-sky-300 mb-1">
                          CV Verification
                        </h6>
                        <p className="text-slate-400 text-[10px] leading-normal">
                          {aiAnalysis.evidenceEvaluation}
                        </p>
                      </div>

                      <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <h6 className="font-bold text-amber-300 mb-1">
                          Enforcement Action
                        </h6>
                        <p className="text-slate-400 text-[10px] leading-normal">
                          {aiAnalysis.correctiveAction}
                        </p>
                      </div>
                    </div>

                    {/* Preventative Safety Advisory */}
                    <div className="bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40 text-[10px] text-emerald-300">
                      <span className="font-bold">🛡️ Road Safety Advisory: </span>
                      {aiAnalysis.roadSafetyNote}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 px-4 flex flex-col items-center justify-center">
                    <Scale className="w-12 h-12 text-slate-600 mb-3" />
                    <h4 className="text-sm font-bold text-slate-300 mb-1">
                      Ready for AI Judicial Citation Assessment
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mb-4">
                      Click &quot;Generate E-Challan&quot; to invoke Gemini 3.7 Flash to review the photographic evidence, verify trajectory history, assign statutory penalties, and draft the official infraction ticket.
                    </p>
                    <button
                      onClick={handleGenerateAiChallan}
                      disabled={isGeneratingAi}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate AI Assessment Dossier
                    </button>
                  </div>
                )}
              </div>

              {/* Status Update Buttons */}
              <div className="pt-4 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-2 mt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateStatus(violation.id, 'VERIFIED')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800/60 transition flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Verified
                  </button>

                  <button
                    onClick={() => onUpdateStatus(violation.id, 'DISMISSED')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Dismiss (False Positive)
                  </button>
                </div>

                {aiAnalysis && (
                  <button
                    onClick={handlePrint}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-400" />
                    Print Ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
