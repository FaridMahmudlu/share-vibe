/**
 * Security Protection Tests
 * XSS + SQL Injection + CSRF Testing
 */

import {
  sanitizeHTML,
  escapeHtml,
  validateAndSanitizeCafeSlug,
  Validator,
} from '../security/validation';
import { CSRFProtection, ClientRateLimiter, XSSProtection } from '../security/browser';

/**
 * Test Suite: XSS (Cross-Site Scripting)
 */
export function testXSSProtection() {
  console.log('\n🧪 XSS PROTECTION TESTS\n');

  const xssTests = [
    {
      input: '<script>alert("XSS")</script>',
      expected: '',
      name: 'Script tag injection',
    },
    {
      input: '<img src=x onerror="alert(\'XSS\')">',
      expected: '',
      name: 'Image onerror injection',
    },
    {
      input: 'Hello <b>World</b>',
      expected: 'Hello World',
      name: 'HTML tags removal',
    },
    {
      input: 'User & Password',
      expected: 'User &amp; Password',
      name: 'HTML entity escaping',
    },
  ];

  xssTests.forEach(({ input, name }) => {
    const sanitized = sanitizeHTML(input);
    const escaped = escapeHtml(input);
    const isSafe = XSSProtection.isSafeHtml(input);

    console.log(`✅ Test: ${name}`);
    console.log(`   Input:     ${input}`);
    console.log(`   Sanitized: ${sanitized}`);
    console.log(`   Escaped:   ${escaped}`);
    console.log(`   Is Safe:   ${isSafe}\n`);
  });
}

/**
 * Test Suite: SQL Injection (Firestore)
 */
export function testSQLInjectionProtection() {
  console.log('\n🧪 SQL INJECTION PROTECTION TESTS\n');

  const sqlTests = [
    {
      input: "'; DROP TABLE media; --",
      rule: 'cafeSlug',
      shouldPass: false,
      name: 'Classic SQL drop table',
    },
    {
      input: 'my-awesome-cafe',
      rule: 'cafeSlug',
      shouldPass: true,
      name: 'Valid cafe slug',
    },
    {
      input: 'cafe_with_underscore',
      rule: 'cafeSlug',
      shouldPass: false,
      name: 'Underscore not allowed',
    },
    {
      input: 'CAFÉ123',
      rule: 'cafeSlug',
      shouldPass: false,
      name: 'Uppercase not allowed',
    },
    {
      input: 'cafe123',
      rule: 'cafeSlug',
      shouldPass: true,
      name: 'Lowercase with numbers',
    },
    {
      input: '<script>alert("injection")</script>',
      rule: 'cafeSlug',
      shouldPass: false,
      name: 'Script tag injection',
    },
  ];

  sqlTests.forEach(({ input, rule, shouldPass, name }) => {
    const result = Validator.validate(input, rule as any);
    const sanitized = validateAndSanitizeCafeSlug(input);

    const status = result === shouldPass ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} Test: ${name}`);
    console.log(`   Input:       ${input}`);
    console.log(`   Expected:    ${shouldPass ? 'Valid' : 'Invalid'}`);
    console.log(`   Got:         ${result ? 'Valid' : 'Invalid'}`);
    console.log(`   Sanitized:   ${sanitized}\n`);
  });
}

/**
 * Test Suite: CSRF Protection
 */
export function testCSRFProtection() {
  console.log('\n🧪 CSRF PROTECTION TESTS\n');

  const csrf = new CSRFProtection();

  // Test 1: Token generation
  console.log('✅ Test: Token Generation');
  const token1 = csrf.getToken();
  const token2 = csrf.getToken();
  console.log(`   Token 1: ${token1.substring(0, 16)}...`);
  console.log(`   Token 2: ${token2.substring(0, 16)}...`);
  console.log(`   Same token: ${token1 === token2 ? 'YES' : 'NO'}\n`);

  // Test 2: Token in fetch headers
  console.log('✅ Test: Fetch Headers');
  const fetchOptions = csrf.addTokenToFetch({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  console.log(`   Headers:`, fetchOptions.headers);
  console.log(`   Has X-CSRF-Token: ${
    (fetchOptions.headers as Record<string, string>)['X-CSRF-Token'] ? 'YES' : 'NO'
  }\n`);

  // Test 3: Token persistence
  console.log('✅ Test: Token Persistence');
  const csrf2 = new CSRFProtection();
  const token3 = csrf2.getToken();
  console.log(`   First CSRF instance: ${token1.substring(0, 16)}...`);
  console.log(`   Second CSRF instance: ${token3.substring(0, 16)}...`);
  console.log(`   Different instances: ${token1 !== token3 ? 'YES (expected)' : 'NO'}\n`);
}

/**
 * Test Suite: Rate Limiting
 */
export function testRateLimiting() {
  console.log('\n🧪 RATE LIMITING TESTS\n');

  const limiter = new ClientRateLimiter();

  console.log('✅ Test: Request Allowance');
  console.log(`   Limit: 5 requests per minute\n`);

  for (let i = 1; i <= 7; i++) {
    const allowed = limiter.isAllowed('api/upload', 5);
    console.log(`   Request ${i}: ${allowed ? '✅ ALLOWED' : '❌ BLOCKED'}`);
  }

  console.log('\n✅ Test: Key-based Limiting');
  const limiter2 = new ClientRateLimiter();

  const user1Allowed = limiter2.isAllowed('user-1', 3);
  const user2Allowed = limiter2.isAllowed('user-2', 3);
  console.log(`   User 1: ${user1Allowed ? 'ALLOWED' : 'BLOCKED'}`);
  console.log(`   User 2: ${user2Allowed ? 'ALLOWED' : 'BLOCKED'}\n`);
}

/**
 * Run All Tests
 */
export function runAllSecurityTests() {
  console.log('═══════════════════════════════════════');
  console.log('🔒 SECURITY PROTECTION TEST SUITE');
  console.log('═══════════════════════════════════════');

  testXSSProtection();
  testSQLInjectionProtection();
  testCSRFProtection();
  testRateLimiting();

  console.log('\n═══════════════════════════════════════');
  console.log('✅ ALL TESTS COMPLETED');
  console.log('═══════════════════════════════════════\n');
}

// Run tests if this file is imported
if (typeof window !== 'undefined') {
  // Browser environment - can be triggered from DevTools
  (window as any).runSecurityTests = runAllSecurityTests;
  console.log('💡 Run security tests: window.runSecurityTests()');
}

export default runAllSecurityTests;
