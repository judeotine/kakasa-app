alter table profiles
  add column if not exists nin text;

comment on column profiles.nin is 'Uganda National Identification Number (NIN), 14 characters starting with CM or CF';
