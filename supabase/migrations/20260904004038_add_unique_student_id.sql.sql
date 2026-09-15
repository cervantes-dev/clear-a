-- One student ID can only belong to one account. Applied after manually
-- resolving the pre-existing test-account duplicate on '20-10101'.
alter table profiles
  add constraint profiles_student_id_unique unique (student_id);