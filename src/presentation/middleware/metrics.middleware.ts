import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { requestMetrics } from '../../infrastructure/metrics/request-metrics';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const route = `${req.method} ${req.path}`;
    requestMetrics.increment(route);
    next();
  }
}
