import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const loadAccessPolicyUtils = async () =>
  import(pathToFileURL(path.resolve(process.cwd(), 'scripts/access/access-policy-utils.mjs')).href);

describe('access policy management utilities', () => {
  it('normalizes and validates email lists', async () => {
    const utils = await loadAccessPolicyUtils();
    const result = utils.validateEmailList([' Owner@Example.COM ', 'bad-email', 'owner@example.com']);

    expect(result.emails).toEqual(['owner@example.com']);
    expect(result.invalidEmails).toEqual(['bad-email']);
  });

  it('adds super owner assignments without duplicates', async () => {
    const utils = await loadAccessPolicyUtils();
    const { policy } = utils.addRoleAssignments(
      { superOwnerEmails: ['root@example.com'], cafeAccess: [] },
      { role: 'super_owner', emails: ['ROOT@example.com', 'new@example.com'], cafeSlugs: [] }
    );

    expect(policy.superOwnerEmails).toEqual(['root@example.com', 'new@example.com']);
  });

  it('resolves owner and manager cafe assignments', async () => {
    const utils = await loadAccessPolicyUtils();
    const policy = {
      superOwnerEmails: ['platform@example.com'],
      cafeAccess: [
        {
          cafeSlug: 'demo-cafe',
          ownerEmails: ['owner@example.com'],
          managerEmails: ['manager@example.com'],
        },
      ],
    };

    expect(utils.resolveRoleAssignments(policy)).toEqual([
      {
        email: 'manager@example.com',
        role: 'manager',
        cafeIds: ['demo-cafe'],
        ownerCafeIds: [],
        managerCafeIds: ['demo-cafe'],
      },
      {
        email: 'owner@example.com',
        role: 'owner',
        cafeIds: ['demo-cafe'],
        ownerCafeIds: ['demo-cafe'],
        managerCafeIds: [],
      },
      {
        email: 'platform@example.com',
        role: 'super_owner',
        cafeIds: [],
        ownerCafeIds: [],
        managerCafeIds: [],
      },
    ]);
  });

  it('removes an email from every role surface', async () => {
    const utils = await loadAccessPolicyUtils();
    const policy = utils.removeEmailFromPolicy(
      {
        superOwnerEmails: ['admin@example.com'],
        cafeAccess: [
          {
            cafeSlug: 'demo-cafe',
            ownerEmails: ['admin@example.com', 'owner@example.com'],
            managerEmails: ['admin@example.com'],
          },
        ],
      },
      'admin@example.com'
    );

    expect(policy).toEqual({
      superOwnerEmails: [],
      cafeAccess: [
        {
          cafeSlug: 'demo-cafe',
          ownerEmails: ['owner@example.com'],
          managerEmails: [],
        },
      ],
    });
  });
});
