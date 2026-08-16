/**
 * OpenAPI 3.0 specification for the GenZ WhatsApp API.
 *
 * Served by swagger-ui-express at /api-docs (see server.js). Covers the core
 * public + admin surfaces; this is a living document — add paths as features
 * evolve.
 */
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'GenZ WhatsApp API',
    version: '1.0.0',
    description: [
      'REST API for the GenZ WhatsApp platform (chat, status, groups, privacy, admin).',
      '',
      '> Message content is stored server-side; see the Privacy Policy / Terms of Service for data handling details.'
    ].join('\n')
  },
  servers: [
    { url: '/api', description: 'API root (mounted under /api and /api/v1)' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      adminBearer: {
        type: 'http',
        scheme: 'bearer',
        description: 'Admin JWT issued after 2FA verification'
      }
    },
    schemas: {
      Message: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          conversationId: { type: 'string' },
          sender: { type: 'string' },
          content: { type: 'string' },
          messageType: { type: 'string', enum: ['text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'poll'] },
          isViewOnce: { type: 'boolean' },
          allowScreenshot: { type: 'boolean' },
          reactions: { type: 'array', items: { $ref: '#/components/schemas/Reaction' } },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Reaction: {
        type: 'object',
        properties: {
          user: { type: 'string' },
          emoji: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      AbuseReport: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          reporterId: { type: 'string' },
          reportedUserId: { type: 'string' },
          category: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          status: { type: 'string', enum: ['pending', 'reviewed', 'resolved'] },
          description: { type: 'string' }
        }
      },
      Settings: {
        type: 'object',
        description: 'Per-user WhatsApp-style settings (privacy, notifications, chats, storage, app). Unknown keys are dropped; invalid enum values are rejected with 400.',
        additionalProperties: true
      },
      Health: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          status: { type: 'string', enum: ['ok'] },
          services: {
            type: 'object',
            properties: {
              mongo: { type: 'string', enum: ['connected', 'disconnected'] },
              redis: { type: 'string', enum: ['connected', 'disabled'] },
              mediaStorage: { type: 'string', enum: ['cloudinary', 'local'] }
            }
          }
        }
      }
    }
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'phoneNumber', 'password'],
                properties: {
                  username: { type: 'string' },
                  phoneNumber: { type: 'string' },
                  password: { type: 'string', minLength: 12 }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'User created (phone verification OTP returned in dev)' },
          400: { description: 'Validation error' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with username/phone + password',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identifier', 'password'],
                properties: {
                  identifier: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Tokens + user payload' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check (mongo, redis, media storage)',
        security: [],
        responses: {
          200: {
            description: 'Service healthy',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } }
          }
        }
      }
    },
    '/messages/{id}/reactions': {
      post: {
        tags: ['Messages'],
        summary: 'Add or update a reaction atomically (one per user)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Message id' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['emoji'],
                properties: { emoji: { type: 'string' } }
              }
            }
          }
        },
        responses: {
          200: { description: 'Reaction added/updated (returns reactions array)' },
          400: { description: 'Missing emoji' },
          403: { description: 'Not a participant' },
          404: { description: 'Message not found' }
        }
      },
      delete: {
        tags: ['Messages'],
        summary: 'Remove the caller\'s reaction',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Reaction removed' },
          404: { description: 'Message not found' }
        }
      }
    },
    '/messages/{id}/screenshot-attempt': {
      post: {
        tags: ['Messages'],
        summary: 'Report a screenshot attempt on a view-once message',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Attempt recorded + sender notified via socket' },
          403: { description: 'Screenshot protection is not enabled for this message' },
          404: { description: 'Message not found' }
        }
      }
    },
    '/users/{id}/block': {
      post: {
        tags: ['Users'],
        summary: 'Block a user (notifies blocker + target only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'User blocked' },
          400: { description: 'Cannot block yourself' },
          404: { description: 'User not found' }
        }
      }
    },
    '/users/{id}/unblock': {
      post: {
        tags: ['Users'],
        summary: 'Unblock a user (notifies blocker + target only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'User unblocked' }
        }
      }
    },
    '/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Get the caller\'s WhatsApp-style settings',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Settings payload', content: { 'application/json': { schema: { $ref: '#/components/schemas/Settings' } } } }
        }
      },
      put: {
        tags: ['Settings'],
        summary: 'Update settings (invalid enum values → 400, unknown keys dropped)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Settings' }
            }
          }
        },
        responses: {
          200: { description: 'Updated settings' },
          400: { description: 'Invalid option value' }
        }
      }
    },
    '/reports/messages/{messageId}': {
      post: {
        tags: ['Reports'],
        summary: 'Report a message (CSAM/child_abuse → priority urgent)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'messageId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: {
                  reason: { type: 'string', enum: ['spam', 'harassment', 'inappropriate_content', 'fake_account', 'scam', 'violence', 'hate_speech', 'csam', 'child_abuse', 'other'] },
                  details: { type: 'string', maxLength: 1000 }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Report created' },
          404: { description: 'Message not found' }
        }
      }
    },
    '/admin/health': {
      get: {
        tags: ['Admin'],
        summary: 'Admin dashboard health',
        security: [{ adminBearer: [] }],
        responses: {
          200: { description: 'Admin health' },
          401: { description: 'Admin auth required' }
        }
      }
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users (admin)',
        security: [{ adminBearer: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Paginated user list' },
          401: { description: 'Admin auth required' }
        }
      }
    },
    '/admin/abuse-reports': {
      get: {
        tags: ['Admin'],
        summary: 'List abuse reports (admin) — filter by priority to triage CSAM first',
        security: [{ adminBearer: [] }],
        responses: {
          200: { description: 'Abuse reports list' },
          401: { description: 'Admin auth required' }
        }
      }
    },
    '/system-gateway-x9k/auth/login': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Admin login step 1 (password → pre-auth token)',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'requiresTwoFactor + preAuthToken (or accessToken when 2FA off)' },
          401: { description: 'Invalid credentials' },
          503: { description: 'Admin not provisioned' }
        }
      }
    }
  }
};

module.exports = openApiSpec;
