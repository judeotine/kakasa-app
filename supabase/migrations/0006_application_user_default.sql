alter table loan_applications alter column user_id set default auth.uid();
alter table application_documents alter column user_id set default auth.uid();
