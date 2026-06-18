export const requestMetrics = {
  totalRequests: 0,
  requestsByRoute: new Map<string, number>(),
  startedAt: new Date(),

  increment(route: string) {
    this.totalRequests++;
    this.requestsByRoute.set(route, (this.requestsByRoute.get(route) ?? 0) + 1);
  },

  snapshot() {
    const routes: Record<string, number> = {};
    this.requestsByRoute.forEach((count, route) => { routes[route] = count; });
    return {
      uptimeSeconds: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      totalRequests: this.totalRequests,
      requestsByRoute: routes,
    };
  },
};
