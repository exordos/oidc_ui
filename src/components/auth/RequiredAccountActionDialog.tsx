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

import { useEffect, useRef } from 'react';

import { PrimaryButton } from '../ui/PrimaryButton/PrimaryButton';

interface RequiredAccountActionDialogProps {
  redirectUrl: string | null;
  onClose: () => void;
}

export function RequiredAccountActionDialog({
  redirectUrl,
  onClose,
}: RequiredAccountActionDialogProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="account-action-dialog"
      aria-labelledby="account-action-title"
      aria-describedby="account-action-description"
      onClose={onClose}
    >
      <h2 id="account-action-title">Complete your Keycloak account setup</h2>
      <p id="account-action-description">
        Your account setup in Keycloak is incomplete. Open Keycloak and complete the required information or actions.
      </p>
      <p>Then return to this page and sign in again.</p>
      {redirectUrl ? (
        <a className="primary-button account-action-dialog__link" href={redirectUrl} target="_blank" rel="noopener noreferrer">
          Open Keycloak <span className="account-action-dialog__new-tab">(new tab)</span>
        </a>
      ) : (
        <p className="login-form__error">
          A valid Keycloak link was not provided. Contact your administrator to complete your account setup.
        </p>
      )}
      <PrimaryButton type="button" onClick={onClose}>Close</PrimaryButton>
    </dialog>
  );
}
