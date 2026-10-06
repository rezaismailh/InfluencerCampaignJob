import { getTranslations } from 'next-intl/server';
import { ActionForm, FieldError } from '@/components/action-form';
import { Card, CardTitle } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { SubmitButton } from '@/components/ui/submit-button';
import { saveClient } from '@/app/admin/actions';
import { requireStaff } from '@/lib/auth';

export default async function Clients() {
  const viewer = await requireStaff('curator');
  const t = await getTranslations('admin');
  const c = await getTranslations('common');
  const { data: clients } = await viewer.supabase.from('clients').select('*').order('name');
  return (
    <div className="space-y-5">
      <PageHeader title={t('clients')} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {!clients?.length && <EmptyState title={t('clientsEmpty')} />}
          {clients?.map((cl) => (
            <Card key={cl.id}>
              <p className="font-bold">{cl.name}</p>
              {cl.pic && <p className="text-[15px] text-teks-redup">{t('clientPic')}: {cl.pic}</p>}
              {cl.notes && <p className="mt-1 whitespace-pre-line text-[15px]">{cl.notes}</p>}
            </Card>
          ))}
        </div>
        <Card>
          <CardTitle className="mb-3">{t('addClient')}</CardTitle>
          <ActionForm action={saveClient} resetOnSuccess>
            <Field label={t('clientName')} htmlFor="name"><Input id="name" name="name" required /><FieldError name="name" /></Field>
            <Field label={t('clientPic')} htmlFor="pic"><Input id="pic" name="pic" /></Field>
            <Field label={t('clientNotes')} htmlFor="notes"><Textarea id="notes" name="notes" /></Field>
            <SubmitButton pendingLabel={c('saving')} className="w-full">{t('addClient')}</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
