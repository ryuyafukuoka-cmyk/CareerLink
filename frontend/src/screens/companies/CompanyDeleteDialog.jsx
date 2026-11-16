import { useEffect, useState } from 'react';
import { deleteCompany, getDeletionImpact } from '@/api/companies.js';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { getErrorMessage, getMessage } from '@/messages';
import './CompanyDeleteDialog.css';

// Admin-only company delete with 3 steps: 1) how much will go  2) warning  3) type the company name.
// Render it only while it is open (the parent mounts / unmounts it).
// If something changed after step 1 (API 409), it goes back to step 1 with fresh counts.
function CompanyDeleteDialog({ company, onClose, onDeleted }) {
    const [step, setStep] = useState(1);
    const [attempt, setAttempt] = useState(0); // +1 each time the counts are loaded again
    const [impactResult, setImpactResult] = useState({ attempt: null, data: null, error: null });
    const [nameInput, setNameInput] = useState('');
    const [notice, setNotice] = useState(null);
    const [deleteError, setDeleteError] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const impactLoading = impactResult.attempt !== attempt;
    const impact = impactLoading ? null : impactResult.data;
    const impactError = impactLoading ? null : impactResult.error;

    useEffect(() => {
        let cancelled = false;
        getDeletionImpact(company.companyId)
            .then((data) => !cancelled && setImpactResult({ attempt, data, error: null }))
            .catch((error) => !cancelled && setImpactResult({ attempt, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [company.companyId, attempt]);

    async function handleDelete() {
        if (nameInput !== company.nameOfficial) {
            setDeleteError(getMessage('E-212'));
            return;
        }
        setDeleteError(null);
        setDeleting(true);
        try {
            await deleteCompany(company.companyId, {
                confirmName: nameInput,
                expectedDeletionVersion: impact.deletionVersion,
            });
            onDeleted(); // leaves the screen, so no state update here
        } catch (error) {
            if (error.status === 409) {
                // Changed since step 1: show the latest counts and ask again.
                setStep(1);
                setNameInput('');
                setAttempt((n) => n + 1);
                setNotice(getMessage('C-104'));
            } else {
                setDeleteError(getErrorMessage(error));
            }
            setDeleting(false);
        }
    }

    function handleConfirm() {
        if (step === 1) setStep(2);
        else if (step === 2) setStep(3);
        else handleDelete();
    }

    const canGoOn = step === 1 ? Boolean(impact) : step === 2 ? true : nameInput.length > 0;

    return (
        <ConfirmDialog
            open
            title={`企業の削除（${step}/3）`}
            confirmLabel={step < 3 ? '次へ' : '削除する'}
            variant={step === 1 ? 'primary' : 'danger'}
            loading={deleting}
            confirmDisabled={!canGoOn}
            onConfirm={handleConfirm}
            onCancel={onClose}
        >
            <p className="company-delete__target">{company.nameOfficial}</p>
            {notice && step === 1 && <p className="company-delete__notice">{notice}</p>}

            {step === 1 && (
                <>
                    {impactLoading && <Loading />}
                    {impactError && (
                        <ErrorMessage
                            error={impactError}
                            onRetry={() => setAttempt((n) => n + 1)}
                        />
                    )}
                    {impact && (
                        <p>
                            {getMessage('C-101', {
                                n: impact.activityRecordCount,
                                m: impact.applicationRoundCount,
                            })}
                        </p>
                    )}
                </>
            )}

            {step === 2 && <p className="company-delete__warning">{getMessage('C-102')}</p>}

            {step === 3 && (
                <>
                    <FormField label="企業名（正式名称）" hint={getMessage('C-103')}>
                        <TextInput
                            value={nameInput}
                            onChange={(event) => setNameInput(event.target.value)}
                            disabled={deleting}
                            autoComplete="off"
                        />
                    </FormField>
                    {deleteError && <ErrorMessage message={deleteError} />}
                </>
            )}
        </ConfirmDialog>
    );
}

export default CompanyDeleteDialog;
