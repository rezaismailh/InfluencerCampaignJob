import { getLocale, getTranslations } from 'next-intl/server';
import { Trash2 } from 'lucide-react';
import { ActionForm } from '@/components/action-form';
import { Card, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { SubmitButton } from '@/components/ui/submit-button';
import { addHoliday, removeHoliday } from '@/app/admin/actions';
import { requireStaff } from '@/lib/auth';
import { formatDate } from '@/lib/dates';

export default async function Holidays() {
  const viewer = await requireStaff();
  const t = await getTranslations('admin');
  const c = await getTranslations('common');
  const locale = await getLocale();
  const { data: holidays } = await viewer.supabase.from('holidays').select('*').order('day');
  return (
    <div className="space-y-5">
      <PageHeader title={t('holidays')} subtitle={t('holidaysHint')} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {!holidays?.length && <EmptyState title={t('holidaysEmpty')} />}
          {holidays?.map((h) => (
            <Card key={h.day} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="font-bold">{formatDate(h.day, locale, true)}</p>
                <p className="text-[15px] text-teks-redup">{h.name}</p>
              </div>
              <form action={removeHoliday}>
                <input type="hidden" name="day" value={h.day} />
                <button className="inline-flex size-11 items-center justify-center rounded-full text-teks-redup hover:bg-latar" aria-label={c('delete')}>
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </form>
            </Card>
          ))}
        </div>
        <Card>
          <CardTitle className="mb-3">{t('addHoliday')}</CardTitle>
          <ActionForm action={addHoliday} resetOnSuccess>
            <Field label={t('holidayDate')} htmlFor="day"><Input id="day" name="day" type="date" required /></Field>
            <Field label={t('holidayName')} htmlFor="name"><Input id="name" name="name" required /></Field>
            <SubmitButton pendingLabel={c('saving')} className="w-full">{t('addHoliday')}</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
