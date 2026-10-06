import { getTranslations } from 'next-intl/server';
import { ActionForm } from '@/components/action-form';
import { Field, Textarea } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { reviewSubmission } from '@/app/admin/actions';
import type { Submission } from '@/lib/types';

export async function ReviewForm({ submission }: { submission: Submission }) {
  const t = await getTranslations('admin');
  return (
    <ActionForm action={reviewSubmission} className="space-y-3 rounded-xl border border-nila-100 bg-nila-50 p-3">
      <input type="hidden" name="submission_id" value={submission.id} />
      <Field label={t('taliFeedback')} htmlFor={`tali-${submission.id}`}>
        <Textarea id={`tali-${submission.id}`} name="tali_feedback" defaultValue={submission.tali_feedback ?? ''} />
      </Field>
      <Field label={t('brandFeedback')} hint={t('feedbackHint')} htmlFor={`brand-${submission.id}`}>
        <Textarea id={`brand-${submission.id}`} name="brand_feedback" defaultValue={submission.brand_feedback ?? ''} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="status" value="approved">{t('approveItem')}</SubmitButton>
        <SubmitButton name="status" value="revision" variant="outline">{t('requestRevision')}</SubmitButton>
        {submission.status === 'pending_review' && <SubmitButton name="status" value="sent_to_brand" variant="outline">{t('sendToBrand')}</SubmitButton>}
        <SubmitButton name="status" value="rejected" variant="ghost">{t('rejectItem')}</SubmitButton>
      </div>
    </ActionForm>
  );
}
