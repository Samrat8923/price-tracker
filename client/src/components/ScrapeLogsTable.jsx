import React from 'react';
import { CheckCircle2, XCircle, Clock, Zap, RotateCw } from 'lucide-react';

export default function ScrapeLogsTable({ logs = [] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500 italic">
        No scrape logs available yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px]">
            <th className="py-2.5 px-3 font-semibold">Attempt</th>
            <th className="py-2.5 px-3 font-semibold">Trigger</th>
            <th className="py-2.5 px-3 font-semibold">Status</th>
            <th className="py-2.5 px-3 font-semibold">Duration</th>
            <th className="py-2.5 px-3 font-semibold">HTTP Code</th>
            <th className="py-2.5 px-3 font-semibold">Timestamp</th>
            <th className="py-2.5 px-3 font-semibold">Details / Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-300">
          {logs.map((log) => {
            const isSuccess = log.status === 'SUCCESS';
            const isAuto = log.trigger_type === 'AUTOMATIC';
            const dateStr = log.completed_at || log.started_at;
            const formattedTime = dateStr
              ? new Date(dateStr).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })
              : 'N/A';

            return (
              <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-2.5 px-3 font-medium text-slate-400">
                  #{log.attempt_number || 1}
                </td>
                <td className="py-2.5 px-3">
                  {isAuto ? (
                    <span className="inline-flex items-center space-x-1 text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-medium text-[11px]">
                      <RotateCw className="h-3 w-3" />
                      <span>AUTOMATIC</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium text-[11px]">
                      <Zap className="h-3 w-3" />
                      <span>MANUAL</span>
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  {isSuccess ? (
                    <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium text-[11px]">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>SUCCESS</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-medium text-[11px]">
                      <XCircle className="h-3 w-3" />
                      <span>FAILURE</span>
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-400">
                  {log.duration_ms ? `${log.duration_ms}ms` : '—'}
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-400">
                  {log.http_status || '200'}
                </td>
                <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                  {formattedTime}
                </td>
                <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">
                  {log.error_message ? (
                    <span className="text-rose-300/90 font-mono text-[11px]" title={log.error_message}>
                      {log.error_message}
                    </span>
                  ) : (
                    <span className="text-slate-500">Scrape & validation passed cleanly</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
