"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  AdminDashboardSnapshot,
  AdminSyncError,
  AdminSyncRun
} from "../src/admin-ops-runtime";

const formatDateTime = (iso: string | null): string => {
  if (!iso) {
    return "-";
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toLocaleString();
};

const statusBadgeClass = (status: AdminSyncRun["status"]): string => {
  if (status === "success") {
    return "badge badge-success";
  }
  if (status === "failed") {
    return "badge badge-failed";
  }
  return "badge badge-running";
};

interface ManualSyncApiResult {
  status: "success" | "failed" | "rate_limited";
  attempts: number;
  message?: string;
  retryAfterMs?: number;
  dryRunPreview?: {
    fetchedCount: number;
    normalizedCount: number;
    changedCount: number;
  };
}

const initialData: AdminDashboardSnapshot = {
  syncRuns: [],
  syncErrors: [],
  recentChanges: [],
  syncTargets: [],
  lastUpdatedAt: new Date(0).toISOString()
};

export default function AdminOpsPage() {
  const [data, setData] = useState<AdminDashboardSnapshot>(initialData);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedBrand, setSelectedBrand] = useState<string>("steam");
  const [dryRun, setDryRun] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [runLog, setRunLog] = useState<string[]>([]);

  const targetBrandOptions = useMemo(
    () => data.syncTargets.map((item) => item.brandSlug),
    [data.syncTargets]
  );

  const fetchDashboard = async (isRefresh: boolean): Promise<void> => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch("/api/dashboard", {
        method: "GET",
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`Dashboard request failed: ${response.status}`);
      }
      const payload = (await response.json()) as AdminDashboardSnapshot;
      setData(payload);
      if (!targetBrandOptions.includes(selectedBrand) && payload.syncTargets[0]) {
        setSelectedBrand(payload.syncTargets[0].brandSlug);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "dashboard fetch failed";
      setRunLog((prev) => [`[fetch-error] ${message}`, ...prev].slice(0, 8));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboard(false);
    const timer = setInterval(() => {
      void fetchDashboard(true);
    }, 30_000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const runManualSync = async (): Promise<void> => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/manual-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          brandSlug: selectedBrand,
          dryRun
        })
      });

      const payload = (await response.json()) as ManualSyncApiResult;
      const retryAfter =
        payload.retryAfterMs !== undefined ? ` retryAfterMs=${payload.retryAfterMs}` : "";
      const preview =
        payload.dryRunPreview !== undefined
          ? ` dryRunPreview=${payload.dryRunPreview.fetchedCount}/${payload.dryRunPreview.normalizedCount}/${payload.dryRunPreview.changedCount}`
          : "";
      const logLine = `[manual-sync] brand=${selectedBrand} status=${payload.status} attempts=${payload.attempts}${retryAfter}${preview} ${payload.message ?? ""}`;
      setRunLog((prev) => [logLine, ...prev].slice(0, 10));
      await fetchDashboard(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "manual sync failed";
      setRunLog((prev) => [`[manual-sync-error] ${message}`, ...prev].slice(0, 10));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main>
        <h1>Admin Operations</h1>
        <p className="meta-text">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main>
      <div className="topbar">
        <div>
          <h1>Admin Operations Dashboard</h1>
          <p>Sync runs, sync errors, recent changes, and manual sync controls.</p>
        </div>
        <button onClick={() => void fetchDashboard(true)} disabled={refreshing || submitting}>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <section className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-header">
          <h2>Manual Sync</h2>
          <span className="meta-text">Last update: {formatDateTime(data.lastUpdatedAt)}</span>
        </div>
        <div className="form-row">
          <label htmlFor="brand">Brand</label>
          <select
            id="brand"
            value={selectedBrand}
            onChange={(event) => setSelectedBrand(event.target.value)}
            disabled={submitting}
          >
            {data.syncTargets.map((target) => (
              <option key={target.brandSlug} value={target.brandSlug}>
                {target.brandName} ({target.brandSlug})
              </option>
            ))}
          </select>
          <label htmlFor="dry-run">
            <input
              id="dry-run"
              type="checkbox"
              checked={dryRun}
              onChange={(event) => setDryRun(event.target.checked)}
              disabled={submitting}
              style={{ marginRight: 6 }}
            />
            Dry-run
          </label>
          <button className="primary" onClick={() => void runManualSync()} disabled={submitting}>
            {submitting ? "Running..." : "Run Manual Sync"}
          </button>
        </div>
        <div className="log-box">
          {runLog.length === 0 ? "No manual sync logs yet." : runLog.join("\n")}
        </div>
      </section>

      <div className="grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Sync Runs</h2>
            <span className="meta-text">{data.syncRuns.length} records</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Status</th>
                  <th>Counts (f/n/c)</th>
                  <th>Attempts</th>
                  <th>Started</th>
                  <th>Finished</th>
                </tr>
              </thead>
              <tbody>
                {data.syncRuns.map((run) => (
                  <tr key={run.id}>
                    <td>{run.brandSlug}</td>
                    <td>
                      <span className={statusBadgeClass(run.status)}>{run.status}</span>
                    </td>
                    <td>
                      {run.fetchedCount}/{run.normalizedCount}/{run.changedCount}
                    </td>
                    <td>{run.attempts}</td>
                    <td>{formatDateTime(run.startedAt)}</td>
                    <td>{formatDateTime(run.finishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Sync Errors</h2>
            <span className="meta-text">{data.syncErrors.length} records</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.syncErrors.map((error: AdminSyncError) => (
                  <tr key={error.id}>
                    <td>{error.brandSlug}</td>
                    <td>{error.errorType}</td>
                    <td>{error.message}</td>
                    <td>{formatDateTime(error.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel" style={{ gridColumn: "1 / -1" }}>
          <div className="panel-header">
            <h2>Recent Changes</h2>
            <span className="meta-text">{data.recentChanges.length} records</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>External ID</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Discount</th>
                  <th>Changed At</th>
                </tr>
              </thead>
              <tbody>
                {data.recentChanges.map((change) => (
                  <tr key={change.saleEventExternalId}>
                    <td>{change.brandSlug}</td>
                    <td>{change.saleEventExternalId}</td>
                    <td>{change.title}</td>
                    <td>{change.status}</td>
                    <td>{change.discountLabel ?? "-"}</td>
                    <td>{formatDateTime(change.changedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
