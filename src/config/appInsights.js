const appInsights = require("applicationinsights");

function setupAppInsights() {
  if (process.env.APPINSIGHTS_CONNECTION_STRING &&
      process.env.APPINSIGHTS_CONNECTION_STRING !== "InstrumentationKey=placeholder") {
    appInsights
      .setup(process.env.APPINSIGHTS_CONNECTION_STRING)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, true)
      .setUseDiskRetryCaching(true)
      .setSendLiveMetrics(true)
      .start();
    console.log("✅ Application Insights initialized");
  } else {
    console.log("⚠️  Application Insights skipped (no connection string)");
  }
}

module.exports = { setupAppInsights, client: appInsights.defaultClient };
