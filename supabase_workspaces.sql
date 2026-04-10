-- 1. [신규] 워크스페이스 테이블 생성
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. [신규] 워크스페이스 멤버(팀원) 테이블 생성
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member', 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- 3. [확장] 기존 documents 테이블에 소속(workspace_id) 컬럼 추가
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE;

-- ==========================================
-- 🛡️ [보안 정책 (RLS) 설정 구간] 🛡️
-- ==========================================

-- A. 워크스페이스(workspaces) 테이블 보안
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "내가 속한 워크스페이스 조회 허용" ON public.workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );
  
CREATE POLICY "누구나 워크스페이스 생성 가능" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- B. 멤버구조(workspace_members) 테이블 보안
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "같은 팀원 조회 허용" ON public.workspace_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "자발적 팀원 가입(초대코드) 허용" ON public.workspace_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "방장과 본인만 탈퇴 허용" ON public.workspace_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- C. 기존 documents 테이블 보안 범위 확장 (팀원에게 공유 허용)
-- (기존에 작성하셨던 documents RLS 룰이 기본적으로 user_id = auth.uid() 로 잡혀있을 것입니다. 
-- 그 룰에 추가로 아래 정책을 하나 더 넣어주시면, 같은 워크스페이스 사람들도 서로 조회/수정이 가능해집니다.)

CREATE POLICY "워크스페이스 공유 문서 읽기/쓰기 허용_2" ON public.documents
  FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- (혹시나 Supabase SQL 에디터에서 에러가 난다면, 이미 존재하는 이름의 정책일 수 있으므로 마지막 "_2"를 붙여 새롭게 추가합니다)
