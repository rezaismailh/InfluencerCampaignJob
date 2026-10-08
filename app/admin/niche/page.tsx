import { getTranslations } from 'next-intl/server';
import { ActionForm, FieldError } from '@/components/action-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { SubmitButton } from '@/components/ui/submit-button';
import { saveTaxonomyItem } from '@/app/admin/actions';
import { requireStaff } from '@/lib/auth';
import { loadTaxonomy, type TaxonomyItem, type TaxonomyKind } from '@/lib/taxonomy';

export async function generateMetadata() {
  const tm = await getTranslations('admin');
  return { title: tm('taxonomyTitle') };
}

export default async function TaxonomyPage() {
  await requireStaff('curator');
  const t = await getTranslations('admin');
  const tax = await loadTaxonomy();
  return (
    <div className="space-y-6">
      <PageHeader title={t('taxonomyTitle')} subtitle={t('taxonomyHint')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section kind="niche" items={tax.niches} />
        <Section kind="persona" items={tax.personas} />
      </div>
    </div>
  );
}

async function Section({ kind, items }: { kind: TaxonomyKind; items: TaxonomyItem[] }) {
  const t = await getTranslations('admin');
  const c = await getTranslations('common');
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{t(kind === 'niche' ? 'niches' : 'personas')}</h2>

      <Card>
        <CardTitle className="mb-3">{t(kind === 'niche' ? 'addNiche' : 'addPersona')}</CardTitle>
        <ActionForm action={saveTaxonomyItem} resetOnSuccess className="space-y-3">
          <input type="hidden" name="kind" value={kind} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('labelId')} htmlFor={`new-${kind}-id`}>
              <Input id={`new-${kind}-id`} name="label_id" placeholder={kind === 'niche' ? 'Otomotif' : 'Pekerja kantoran'} />
              <FieldError name="label_id" />
            </Field>
            <Field label={t('labelEn')} htmlFor={`new-${kind}-en`}>
              <Input id={`new-${kind}-en`} name="label_en" placeholder={kind === 'niche' ? 'Automotive' : 'Office worker'} />
            </Field>
          </div>
          <SubmitButton pendingLabel={c('saving')}>{t('add')}</SubmitButton>
        </ActionForm>
      </Card>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            <Card>
              <ActionForm action={saveTaxonomyItem} className="space-y-3">
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="key" value={item.key} />
                <div className="flex items-center justify-between gap-2">
                  <code className="text-[13px] text-teks-redup">{item.key}</code>
                  {!item.active && <Badge>{t('inactive')}</Badge>}
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_80px]">
                  <Field label={t('labelId')} htmlFor={`${kind}-${item.key}-id`}>
                    <Input id={`${kind}-${item.key}-id`} name="label_id" defaultValue={item.label_id} />
                    <FieldError name="label_id" />
                  </Field>
                  <Field label={t('labelEn')} htmlFor={`${kind}-${item.key}-en`}>
                    <Input id={`${kind}-${item.key}-en`} name="label_en" defaultValue={item.label_en ?? ''} />
                  </Field>
                  <Field label={t('sortOrder')} htmlFor={`${kind}-${item.key}-sort`}>
                    <Input id={`${kind}-${item.key}-sort`} name="sort" inputMode="numeric" defaultValue={item.sort} className="tabular" />
                  </Field>
                </div>
                <label className="flex min-h-11 items-center gap-3 text-[15px]">
                  <input type="checkbox" name="active" defaultChecked={item.active} className="size-5 accent-nila-800" />
                  {t('activeLabel')}
                </label>
                <SubmitButton variant="outline" size="sm" pendingLabel={c('saving')}>{c('save')}</SubmitButton>
              </ActionForm>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
