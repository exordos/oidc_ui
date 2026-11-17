/*
 * Copyright 2025 Genesis Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Only the explicit Core required-action response may offer an external link. */
export function getRequiredAccountAction(
  error: { status: number; responseBody: string },
): { redirectUrl: string | null } | null {
  if (error.status !== 400) return null;

  let data: unknown;
  try {
    data = JSON.parse(error.responseBody);
  } catch {
    return null;
  }
  if (
    !data || typeof data !== 'object' || !('error' in data) ||
    data.error !== 'external_action_required'
  ) return null;

  let redirectUrl: string | null = null;
  if ('redirect_url' in data && typeof data.redirect_url === 'string') {
    try {
      const url = new URL(data.redirect_url);
      if (
        (url.protocol === 'https:' || url.protocol === 'http:') &&
        !url.username && !url.password
      ) {
        redirectUrl = url.href;
      }
    } catch {
      // Keep the account setup explanation, but never render a malformed link.
    }
  }
  return { redirectUrl };
}

