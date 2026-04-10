-- 사용자가 직접 Supabase SQL Editor(왼쪽 사이드바 SQL Editor)에서 실행해야 하는 스크립트입니다.

-- 1. 사용자 개별 설정을 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.users_settings (
  id uuid primary key references auth.users(id) on delete cascade on update cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 단원(시험지 묶음)을 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade on update cascade,
  group_path text not null default '미분류',
  title text not null default '제목 없음',
  content jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 인덱스 설정 (조회 시 성능 향상)
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_group_path ON public.documents(group_path);

-- Row Level Security (RLS) 설정: 오직 자기 자신의 시험지만 보고 수정할 수 있습니다.
ALTER TABLE public.users_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and edit their own settings" 
  ON public.users_settings FOR ALL 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can configure their own documents" 
  ON public.documents FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
