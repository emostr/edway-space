import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestTeacher } from '../types';

export const CurrentTeacher = createParamDecorator(
  (field: keyof RequestTeacher | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ teacher?: RequestTeacher }>();
    const teacher = request.teacher;
    if (!teacher) {
      return undefined;
    }
    return field ? teacher[field] : teacher;
  },
);
