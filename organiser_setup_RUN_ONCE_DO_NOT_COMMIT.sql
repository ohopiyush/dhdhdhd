-- Type your real password below, run once in Supabase SQL Editor, then delete this file. Never commit it.
insert into organisers(username,password_hash) values ('piyush123', crypt('TYPE_PASSWORD_HERE', gen_salt('bf')));
