import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './errorHandler';

export type ValidationTarget = 'body' | 'query' | 'params' | 'headers';

export interface ValidationSchemas {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

export const validate = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, any[]> = {};

    if (schemas.body) {
      const { error } = schemas.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        errors.body = formatValidationErrors(error);
      }
    }

    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        errors.query = formatValidationErrors(error);
      } else {
        req.query = value;
      }
    }

    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        errors.params = formatValidationErrors(error);
      } else {
        req.params = value;
      }
    }

    if (schemas.headers) {
      const { error } = schemas.headers.validate(req.headers, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        errors.headers = formatValidationErrors(error);
      }
    }

    if (Object.keys(errors).length > 0) {
      next(new ValidationError('参数验证失败', errors));
      return;
    }

    next();
  };
};

export const validateBody = (schema: Joi.ObjectSchema) => validate({ body: schema });
export const validateQuery = (schema: Joi.ObjectSchema) => validate({ query: schema });
export const validateParams = (schema: Joi.ObjectSchema) => validate({ params: schema });

function formatValidationErrors(error: Joi.ValidationError): any[] {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));
}

export const commonSchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  idParam: Joi.object({
    id: Joi.number().integer().positive().required()
  }),

  idsParam: Joi.object({
    ids: Joi.string().custom((value, helpers) => {
      const ids = value.split(',').map((id: string) => parseInt(id.trim(), 10));
      if (ids.some(isNaN)) {
        return helpers.error('any.invalid');
      }
      return ids;
    }).required()
  }),

  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }),

  regionId: Joi.object({
    regionId: Joi.number().integer().positive().optional()
  }),

  keyword: Joi.object({
    keyword: Joi.string().trim().max(100).optional()
  }),

  status: Joi.object({
    status: Joi.number().integer().optional()
  })
};

export const createPaginationSchema = <T extends Joi.SchemaMap>(extraFields?: T) => {
  return commonSchemas.pagination.concat(Joi.object(extraFields || {}));
};

export const validateAndTransform = <T>(
  value: any,
  schema: Joi.Schema
): T => {
  const { error, value: validatedValue } = schema.validate(value, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    throw new ValidationError('参数验证失败', formatValidationErrors(error));
  }

  return validatedValue as T;
};
