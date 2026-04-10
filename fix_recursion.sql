-- 1. 모든 이전 정책을 삭제하여 꼬인 실타래를 완전히 풉니다.
DROP POLICY IF EXISTS "내가 속한 워크스페이스 조회 허용" ON public.workspaces;
DROP POLICY IF EXISTS "누구나 워크스페이스 생성 가능" ON public.workspaces;
DROP POLICY IF EXISTS "같은 팀원 조회 허용" ON public.workspace_members;
DROP POLICY IF EXISTS "자발적 팀원 가입(초대코드) 허용" ON public.workspace_members;
DROP POLICY IF EXISTS "방장과 본인만 탈퇴 허용" ON public.workspace_members;

-- 2. 워크스페이스 보안 정책 재수립 (A가 B를 바라봄)
CREATE POLICY "Workspaces_Select" ON public.workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Workspaces_Insert" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Workspaces_Update" ON public.workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Workspaces_Delete" ON public.workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- 3. 멤버십 방어 정책 재수립 (B가 A를 바라보지 않도록 완전히 차단하여 순환 침해 방지)
CREATE POLICY "Members_Select" ON public.workspace_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Members_Insert" ON public.workspace_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members_Delete" ON public.workspace_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );
