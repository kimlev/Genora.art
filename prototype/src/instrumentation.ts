export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startReservationReconciler } = await import("@/lib/server/reservation-reconcile");
  startReservationReconciler();
  const { reconcileOpenGenerationJobs } = await import("@/lib/server/generation-reconcile");
  await reconcileOpenGenerationJobs().catch((error) => {
    console.error("generation_reconcile_startup", error instanceof Error ? error.message : "unknown");
  });
}
