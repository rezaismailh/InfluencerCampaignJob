import { getTranslations } from 'next-intl/server';
import { ActionForm, FieldError } from '@/components/action-form';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { saveJob } from '@/app/admin/actions';
import { PLATFORMS } from '@/lib/social';
import { TIERS } from '@/lib/tiers';
import type { Job } from '@/lib/types';

const PERSONAS = ['genz', 'student', 'foodies', 'lifestyle', 'parent', 'professional', 'other'];

function Chips({ name, options, checked, label }: { name: string; options: { value: string; label: string }[]; checked: string[]; label: string }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-[15px] font-bold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-garis bg-kertas px-3 has-[:checked]:border-nila-800 has-[:checked]:bg-nila-50">
            <input type="checkbox" name={name} value={o.value} defaultChecked={checked.includes(o.value)} className="accent-nila-800" />
            <span className="text-[15px]">{o.label}</span>
          </label>
        ))}
      </div>
      <FieldError name={name} />
    </fieldset>
  );
}

export async function JobForm({ job, realBrand, clients }: { job?: Job; realBrand?: string | null; clients: { id: string; name: string }[] }) {
  const t = await getTranslations('admin.jobForm');
  const tp = await getTranslations('platform');
  const tt = await getTranslations('jobType');
  const tpo = await getTranslations('productOption');
  const tst = await getTranslations('jobStatus');
  const ttier = await getTranslations('tier');
  const tper = await getTranslations('persona');
  const c = await getTranslations('common');
  // New jobs are disguised by default; an existing job is disguised when it has a real name stored separately.
  const disguised = job ? !!realBrand : true;
  const locations = (job?.visit_locations ?? []).map((l) => [l.name, l.address ?? '', l.maps_url ?? ''].join(' | ')).join('\n');

  return (
    <ActionForm action={saveJob} className="space-y-5">
      {job && <input type="hidden" name="id" value={job.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('client')} htmlFor="client_id">
          <Select id="client_id" name="client_id" defaultValue={job?.client_id ?? ''}>
            <option value="">{t('noClient')}</option>
            {clients.map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
          </Select>
        </Field>
        <Field label={t('brandName')} htmlFor="brand_name">
          <Input id="brand_name" name="brand_name" defaultValue={realBrand ?? job?.brand_name ?? ''} required /><FieldError name="brand_name" />
        </Field>
        <Field label={t('brandDisplay')} htmlFor="brand_display">
          <Select id="brand_display" name="brand_display" defaultValue={disguised ? 'alias' : 'real'}>
            <option value="alias">{t('brandDisplayAlias')}</option>
            <option value="real">{t('brandDisplayReal')}</option>
          </Select>
        </Field>
        <Field label={t('brandAlias')} hint={t('brandAliasHint')} htmlFor="brand_alias">
          <Input id="brand_alias" name="brand_alias" defaultValue={realBrand ? job?.brand_name : ''} placeholder={t('brandAliasPlaceholder')} />
          <FieldError name="brand_alias" />
        </Field>
        <Field label={t('title')} htmlFor="title">
          <Input id="title" name="title" defaultValue={job?.title ?? ''} required /><FieldError name="title" />
        </Field>
        <Field label={t('product')} htmlFor="product"><Input id="product" name="product" defaultValue={job?.product ?? ''} /><FieldError name="product" /></Field>
        <Field label={t('jobType')} htmlFor="job_type">
          <Select id="job_type" name="job_type" defaultValue={job?.job_type ?? 'non_visit'}>
            <option value="non_visit">{tt('non_visit')}</option>
            <option value="visit">{tt('visit')}</option>
          </Select>
        </Field>
        <Field label={t('phase')} hint={t('phaseHint')} htmlFor="phase"><Input id="phase" name="phase" defaultValue={job?.phase ?? ''} /></Field>
      </div>

      <Chips name="platforms" label={t('platforms')} checked={job?.platforms ?? []} options={PLATFORMS.map((p) => ({ value: p, label: tp(p) }))} />

      <Field label={t('deliverables')} hint={t('deliverablesHint')} htmlFor="deliverables">
        <Textarea id="deliverables" name="deliverables" defaultValue={job?.deliverables ?? ''} required /><FieldError name="deliverables" />
      </Field>
      <Field label={t('brief')} htmlFor="brief">
        <Textarea id="brief" name="brief" rows={6} defaultValue={job?.brief ?? ''} required /><FieldError name="brief" />
      </Field>
      <Field label={t('requirements')} htmlFor="requirements"><Textarea id="requirements" name="requirements" defaultValue={job?.requirements ?? ''} /><FieldError name="requirements" /></Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Chips name="tiers" label={t('tiers')} checked={job?.tiers ?? []} options={TIERS.map((v) => ({ value: v, label: ttier(v) }))} />
        <Field label={t('minFollowers')} htmlFor="min_followers">
          <Input id="min_followers" name="min_followers" inputMode="numeric" defaultValue={job?.min_followers ?? 0} className="tabular" />
        </Field>
      </div>
      <Chips name="personas" label={t('personas')} checked={job?.personas ?? []} options={PERSONAS.map((v) => ({ value: v, label: tper(v) }))} />

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t('feeType')} htmlFor="fee_type">
          <Select id="fee_type" name="fee_type" defaultValue={job?.fee_type ?? 'fixed'}>
            <option value="fixed">{t('feeFixed')}</option>
            <option value="open">{t('feeOpen')}</option>
          </Select>
        </Field>
        <Field label={t('fee')} htmlFor="fee">
          <Input id="fee" name="fee" inputMode="numeric" defaultValue={job?.fee ?? ''} className="tabular" /><FieldError name="fee" />
        </Field>
        <Field label={t('rateCap')} htmlFor="rate_cap">
          <Input id="rate_cap" name="rate_cap" inputMode="numeric" defaultValue={job?.rate_cap ?? ''} className="tabular" />
        </Field>
        <Field label={t('quota')} htmlFor="quota">
          <Input id="quota" name="quota" inputMode="numeric" defaultValue={job?.quota ?? ''} required className="tabular" /><FieldError name="quota" />
        </Field>
        <Field label={t('reviewDays')} htmlFor="review_days">
          <Input id="review_days" name="review_days" inputMode="numeric" defaultValue={job?.review_days ?? ''} className="tabular" />
        </Field>
        <Field label={t('top')} htmlFor="top_days">
          <Select id="top_days" name="top_days" defaultValue={String(job?.top_days ?? 7)}>
            {[7, 14, 30].map((d) => <option key={d} value={d}>{t('topOption', { days: d })}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('productOption')} htmlFor="product_option">
          <Select id="product_option" name="product_option" defaultValue={job?.product_option ?? 'none'}>
            {(['shipped', 'self_purchase', 'none'] as const).map((o) => <option key={o} value={o}>{tpo(o)}</option>)}
          </Select>
        </Field>
        <label className="flex min-h-11 items-center gap-3 self-end text-[15px]">
          <input type="checkbox" name="require_purchase_proof" defaultChecked={job?.require_purchase_proof} className="size-5 accent-nila-800" />
          {t('requirePurchaseProof')}
        </label>
      </div>
      <Field label={t('visitLocations')} hint={t('visitLocationsHint')} htmlFor="visit_locations">
        <Textarea id="visit_locations" name="visit_locations" defaultValue={locations} placeholder="Indomaret Lontar | Jl. Raya Lontar No.42, Surabaya | https://maps.google.com/?cid=…" />
        <FieldError name="visit_locations" />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t('applyDeadline')} htmlFor="apply_deadline"><Input id="apply_deadline" name="apply_deadline" type="date" defaultValue={job?.apply_deadline ?? ''} /></Field>
        <Field label={t('contentDeadline')} htmlFor="content_deadline"><Input id="content_deadline" name="content_deadline" type="date" defaultValue={job?.content_deadline ?? ''} /></Field>
        <Field label={t('status')} htmlFor="status">
          <Select id="status" name="status" defaultValue={job?.status ?? 'draft'}>
            {(['draft', 'open', 'closed', 'completed'] as const).map((s) => <option key={s} value={s}>{tst(s)}</option>)}
          </Select>
        </Field>
      </div>
      <SubmitButton pendingLabel={c('saving')} className="w-full md:w-auto">{t('save')}</SubmitButton>
    </ActionForm>
  );
}
