export const createUserSchema = {
  body: {
    type: 'object',
    required: ['email', 'name'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        maxLength: 255,
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
    },
    additionalProperties: false,
  },
};

export const getUserSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      },
    },
  },
};
