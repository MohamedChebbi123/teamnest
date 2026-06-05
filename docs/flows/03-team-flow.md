# Team Flow — Every Line of Code

## File: `backend/models/Teams.py` (23 lines)

| Lines | Code |
|-------|------|
| 6-13 | `class Teams(Base):` / `__tablename__="teams"` / `team_id=Column(Integer,primary_key=True)` / `team_name=Column(String,index=True,nullable=False)` / `team_size=Column(Integer,nullable=True)` / `description=Column(Text,nullable=True)` / `created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))` / `org_id=Column(Integer,ForeignKey("organization.organization_id"),nullable=False)` |
| 15-21 | `organization = relationship("Organization", back_populates="teams")` / `channels = relationship("Channels", back_populates="team", cascade="all, delete-orphan")` / `team_members = relationship("Team_association", back_populates="team", cascade="all, delete-orphan")` / `team_roles = relationship("Team_roles", back_populates="team", cascade="all, delete-orphan")` / `files = relationship("Files", back_populates="team", cascade="all, delete-orphan")` / `tasks = relationship("Tasks", back_populates="team", cascade="all, delete-orphan")` / `users = relationship("Users", secondary="team_association", back_populates="teams", viewonly=True)` |

## File: `backend/models/Team_association.py` (13 lines)

| Lines | Code |
|-------|------|
| 6-9 | `class Team_association(Base):` / `__tablename__="team_association"` / `team_id=Column(Integer,ForeignKey("teams.team_id"),primary_key=True,nullable=False)` / `user_id=Column(Integer,ForeignKey("users.user_id"),primary_key=True,nullable=False)` |
| 11-12 | `team = relationship("Teams", back_populates="team_members")` / `user = relationship("Users", back_populates="team_associations")` |

## File: `backend/models/Team_roles.py` (24 lines)

| Lines | Code |
|-------|------|
| 6-18 | `class Team_roles(Base):` / `__tablename__="team_roles"` / `team_role_id=Column(Integer,primary_key=True)` / `user_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)` / `team_id=Column(Integer,ForeignKey("teams.team_id"),nullable=False)` / `role=Column(String,nullable=False)` / `can_create_channels=Column(Boolean,default=False)` / `can_send_messages=Column(Boolean,default=False)` / `can_delete_messages=Column(Boolean,default=False)` / `can_manage_roles=Column(Boolean,default=False)` / `can_kick_members=Column(Boolean,default=False)` / `can_make_announcement=Column(Boolean,default=False)` / `can_manage_tasks=Column(Boolean,default=False)` |
| 19-23 | `created_at = Column(DateTime(timezone=True), default=datetime.now(UTC))` / `updated_at = Column(DateTime(timezone=True), default=datetime.now(UTC), onupdate=datetime.now(UTC))` / `user = relationship("Users", back_populates="team_roles")` / `team = relationship("Teams", back_populates="team_roles")` |

## File: `backend/routers/team_router.py` (179 lines)

| Lines | Code |
|-------|------|
| 1-28 | Imports: `from schemas.Add_members_team import Add_members_team` / `from schemas.Update_team_member_role import Update_team_member_role` / `from schemas.Channels_input import Channels_input` / `from services.team_service import (create_team, fetch_teams_service, delete_team_service, update_team_service, add_memebers_to_teams, fetch_team_members_service, update_member_permissions_service, kick_member_service, fetch_user_team_service, create_channels_for_teams_service, fetch_channels_for_teams_service, fetch_members_info, revoke_permissions_from_team_memebers, fetch_files_for_team_channel_service, view_pdf)` / `from fastapi import APIRouter, Depends, Query` / `from sqlalchemy.orm import Session` / `from database.connection import connect_databse` / `from schemas.team_creation import team_creation` / `from models.Users import Users` / `from utils.security import current_user` / `router = APIRouter()` |
| 31-38 | `@router.post("/organization/{org_id}/create_team")` / `async def create_team_endpoint(org_id: int, data: team_creation, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return create_team(data, user, db)` |
| 41-47 | `@router.get("/organization/{org_id}/teams")` / `async def get_teams(org_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return fetch_teams_service(org_id, user, db)` |
| 50-57 | `@router.put("/team/{team_id}")` / `async def update_team(team_id: int, data: team_creation, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return update_team_service(team_id, data, user, db)` |
| 60-66 | `@router.delete("/team/{team_id}")` / `async def delete_team(team_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return delete_team_service(team_id, user, db)` |
| 69-76 | `@router.post("/team/{team_id}")` / `async def add_members_to_team(team_id: int, data: Add_members_team, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return add_memebers_to_teams(team_id, data, user, db)` |
| 79-85 | `@router.get("/team/{team_id}/members")` / `async def get_team_members(team_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return fetch_team_members_service(team_id, user, db)` |
| 88-96 | `@router.put("/team/{team_id}/member/{member_user_id}/permissions")` / `async def update_member_permissions(team_id: int, member_user_id: int, data: Update_team_member_role, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return update_member_permissions_service(team_id, member_user_id, data, user, db)` |
| 99-107 | `@router.put("/team/{team_id}/member/{member_user_id}/revoke-permissions")` / `async def revoke_member_permissions(team_id: int, member_user_id: int, permission_name: str \| None = Query(None), user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return revoke_permissions_from_team_memebers(team_id, member_user_id, user, db, permission_name)` |
| 110-117 | `@router.delete("/team/{team_id}/member/{member_user_id}")` / `async def kick_member(team_id: int, member_user_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return kick_member_service(team_id, member_user_id, user, db)` |
| 120-125 | `@router.get("/user/teams")` / `async def get_user_teams(user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return fetch_user_team_service(user, db)` |
| 128-136 | `@router.post("/organization/{org_id}/team/{team_id}/channels")` / `async def create_channel_for_team(org_id: int, team_id: int, data: Channels_input, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return create_channels_for_teams_service(org_id, team_id, data, user, db)` |
| 139-146 | `@router.get("/organization/{org_id}/team/{team_id}/channels")` / `async def get_team_channels(org_id: int, team_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return fetch_channels_for_teams_service(org_id, team_id, user, db)` |
| 149-157 | `@router.get("/organization/{org_id}/team/{team_id}/member/{user_id}")` / `async def get_member_info(org_id: int, team_id: int, user_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return fetch_members_info(org_id, team_id, user_id, user, db)` |
| 160-168 | `@router.get("/organization/{org_id}/team/{team_id}/channel/{channel_id}/files")` / `async def get_team_channel_files(org_id: int, team_id: int, channel_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return fetch_files_for_team_channel_service(org_id, team_id, channel_id, user, db)` |
| 171-179 | `@router.get("/organization/{org_id}/team/{team_id}/file/{file_id}/content")` / `async def view_team_file_content(org_id: int, team_id: int, file_id: int, user: Users = Depends(current_user), db: Session = Depends(connect_databse)):` / `return view_pdf(org_id, team_id, file_id, user, db)` |

## File: `backend/services/team_service.py` (1001 lines)

### `create_team` (lines 23-75)
| Line | Code |
|------|------|
| 24 | `user_id = user.user_id` |
| 26 | `found_organization = db.query(Organization).filter(Organization.organization_id == data.org_id).first()` |
| 28-29 | `if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 31-34 | `is_owner = db.query(Organization).filter(Organization.organization_id == data.org_id, Organization.owner_id == user_id).first()` |
| 36-40 | `is_admin = db.query(Organization_members).filter(Organization_members.org_id == data.org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first()` |
| 42-46 | `if not is_owner and not is_admin: raise HTTPException(status_code=403, detail="Only organization owner or admin can create teams")` |
| 48-51 | `existing_team = db.query(Teams).filter(Teams.org_id == data.org_id, Teams.team_name == data.team_name).first()` |
| 53-54 | `if existing_team: raise HTTPException(status_code=400, detail="Team name already exists in this organization")` |
| 56-60 | `new_team = Teams(team_name=data.team_name, description=data.description, org_id=data.org_id)` |
| 62-64 | `db.add(new_team); db.commit(); db.refresh(new_team)` |
| 66 | `create_log(db, org_id=data.org_id, actor_id=user_id, action="team_created", target_id=new_team.team_id, target_type="team", metadata={"team_name": new_team.team_name})` |
| 68-75 | `return {"message": "Team created successfully", "team_id": new_team.team_id, "team_name": new_team.team_name, "description": new_team.description, "org_id": new_team.org_id, "created_at": new_team.created_at}` |

### `fetch_teams_service` (lines 77-108)
| Line | Code |
|------|------|
| 78 | `user_id = user.user_id` |
| 80-83 | `found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 85 | `is_owner = found_organization.owner_id == user_id` |
| 87-90 | `is_member = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id).first()` |
| 92-93 | `if not is_owner and not is_member: raise HTTPException(status_code=403, detail="You must be a member of this organization to view teams")` |
| 95 | `found_teams = db.query(Teams).filter(Teams.org_id == org_id).all()` |
| 97-108 | `teams_list = [{"team_id": team.team_id, "team_name": team.team_name, "description": team.description, "org_id": team.org_id, "created_at": team.created_at} for team in found_teams]; return teams_list` |

### `delete_team_service` (lines 110-144)
| Line | Code |
|------|------|
| 111 | `user_id = user.user_id` |
| 113-116 | `team = db.query(Teams).filter(Teams.team_id == team_id).first(); if not team: raise HTTPException(status_code=404, detail="Team not found")` |
| 118-121 | `found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 123-128 | `is_owner = found_organization.owner_id == user_id; is_admin = db.query(Organization_members).filter(Organization_members.org_id == team.org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first()` |
| 130-134 | `if not is_owner and not is_admin: raise HTTPException(status_code=403, detail="Only organization owner or admin can delete teams")` |
| 136 | `create_log(db, org_id=team.org_id, actor_id=user_id, action="team_deleted", target_id=team_id, target_type="team", metadata={"team_name": team.team_name})` |
| 138-139 | `db.delete(team); db.commit()` |
| 141-144 | `return {"message": "Team deleted successfully", "team_id": team_id}` |

### `update_team_service` (lines 146-197)
| Line | Code |
|------|------|
| 147 | `user_id = user.user_id` |
| 149-152 | `team = db.query(Teams).filter(Teams.team_id == team_id).first(); if not team: raise HTTPException(status_code=404, detail="Team not found")` |
| 154-157 | `found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 159-164 | `is_owner = found_organization.owner_id == user_id; is_admin = db.query(Organization_members).filter(Organization_members.org_id == team.org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first()` |
| 166-170 | `if not is_owner and not is_admin: raise HTTPException(status_code=403, detail="Only organization owner or admin can update teams")` |
| 172-180 | `if data.team_name != team.team_name: existing_team = db.query(Teams).filter(Teams.org_id == team.org_id, Teams.team_name == data.team_name, Teams.team_id != team_id).first(); if existing_team: raise HTTPException(status_code=400, detail="Team name already exists in this organization")` |
| 182-183 | `team.team_name = data.team_name; team.description = data.description` |
| 185-186 | `db.commit(); db.refresh(team)` |
| 188 | `create_log(db, org_id=team.org_id, actor_id=user_id, action="team_updated", target_id=team.team_id, target_type="team", metadata={"team_name": team.team_name})` |
| 190-197 | `return {"message": "Team updated successfully", "team_id": team.team_id, "team_name": team.team_name, "description": team.description, "org_id": team.org_id, "created_at": team.created_at}` |

### `add_memebers_to_teams` (lines 199-291)
| Line | Code |
|------|------|
| 201 | `user_id = user.user_id` |
| 203-206 | `team = db.query(Teams).filter(Teams.team_id == team_id).first(); if not team: raise HTTPException(status_code=404, detail="Team not found")` |
| 208-211 | `found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 213-218 | `is_owner = found_organization.owner_id == user_id; is_admin = db.query(Organization_members).filter(Organization_members.org_id == team.org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first()` |
| 220-224 | `if not is_owner and not is_admin: raise HTTPException(status_code=403, detail="Only organization owner or admin can add members to teams")` |
| 226-228 | `target_user = db.query(Users).filter(Users.user_id == data.user_id).first(); if not target_user: raise HTTPException(status_code=404, detail="User not found")` |
| 230-240 | `is_org_owner = found_organization.owner_id == data.user_id; is_org_member = db.query(Organization_members).filter(Organization_members.org_id == team.org_id, Organization_members.memmber_id == data.user_id).first(); if not is_org_owner and not is_org_member: raise HTTPException(status_code=400, detail="User must be a member of the organization first")` |
| 242-248 | `existing_member = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == data.user_id).first(); if existing_member: raise HTTPException(status_code=400, detail="User is already a member of this team")` |
| 250-254 | `new_team_member = Team_association(team_id=team_id, user_id=data.user_id); db.add(new_team_member)` |
| 256-268 | `new_role = Team_roles(user_id=data.user_id, team_id=team_id, role=data.role, can_create_channels=data.can_create_channels, can_send_messages=data.can_send_messages, can_delete_messages=data.can_delete_messages, can_manage_roles=data.can_manage_roles, can_kick_members=data.can_kick_members, can_make_announcement=data.can_make_announcement, can_manage_tasks=data.can_manage_tasks); db.add(new_role)` |
| 270-272 | `db.commit(); db.refresh(new_team_member); db.refresh(new_role)` |
| 274-276 | `added_user = db.query(Users).filter(Users.user_id == data.user_id).first(); added_name = f"{added_user.first_name} {added_user.last_name}" if added_user else str(data.user_id); create_log(db, org_id=team.org_id, actor_id=user_id, action="team_member_added", target_id=data.user_id, target_type="user", metadata={"team_id": team_id, "team_name": team.team_name, "role": data.role, "member_name": added_name})` |
| 278-291 | `return {"message": "Member added successfully", "user_id": data.user_id, "team_id": team_id, "role": new_role.role, "permissions": {"can_create_channels": new_role.can_create_channels, "can_send_messages": new_role.can_send_messages, "can_delete_messages": new_role.can_delete_messages, "can_manage_roles": new_role.can_manage_roles, "can_kick_members": new_role.can_kick_members, "can_make_announcement": new_role.can_make_announcement}}` |

### `fetch_team_members_service` (lines 293-355)
| Line | Code |
|------|------|
| 294 | `user_id = user.user_id` |
| 296-299 | `team = db.query(Teams).filter(Teams.team_id == team_id).first(); if not team: raise HTTPException(status_code=404, detail="Team not found")` |
| 301-304 | `found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 306-313 | `is_owner = found_organization.owner_id == user_id; is_org_member = db.query(Organization_members).filter(Organization_members.org_id == team.org_id, Organization_members.memmber_id == user_id).first(); if not is_owner and not is_org_member: raise HTTPException(status_code=403, detail="You must be a member of this organization to view team members")` |
| 315-317 | `team_associations = db.query(Team_association).filter(Team_association.team_id == team_id).all()` |
| 319-349 | `members_list = []; for association in team_associations: member_user = db.query(Users).filter(Users.user_id == association.user_id).first(); role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == association.user_id).first(); if member_user: member_data = {"user_id": member_user.user_id, "first_name": member_user.first_name, "last_name": member_user.last_name, "email": member_user.email, "avatar_url": member_user.avatar_url, "user_tag": member_user.user_tag, "phone_number": member_user.phone_number, "country": member_user.country, "role": role.role if role else "MEMBER", "permissions": {"can_create_channels": role.can_create_channels if role else False, "can_send_messages": role.can_send_messages if role else False, "can_delete_messages": role.can_delete_messages if role else False, "can_manage_roles": role.can_manage_roles if role else False, "can_kick_members": role.can_kick_members if role else False, "can_make_announcement": role.can_make_announcement if role else False, "can_manage_tasks": role.can_manage_tasks if role else False} if role else None}; members_list.append(member_data)` |
| 351-355 | `return {"team_id": team_id, "team_name": team.team_name, "members": members_list}` |

### `update_member_permissions_service` (lines 357-461)
| Line | Code |
|------|------|
| 358 | `user_id = user.user_id` |
| 360-363 | `team = db.query(Teams).filter(Teams.team_id == team_id).first(); if not team: raise HTTPException(status_code=404, detail="Team not found")` |
| 365-368 | `found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 370-375 | `is_owner = found_organization.owner_id == user_id; is_admin = db.query(Organization_members).filter(Organization_members.org_id == team.org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first()` |
| 377-382 | `user_role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == user_id).first(); has_manage_permission = user_role and user_role.can_manage_roles if user_role else False` |
| 384-388 | `if not is_owner and not is_admin and not has_manage_permission: raise HTTPException(status_code=403, detail="You don't have permission to manage roles in this team")` |
| 390-396 | `target_member = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == member_user_id).first(); if not target_member: raise HTTPException(status_code=404, detail="User is not a member of this team")` |
| 398-404 | `member_role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == member_user_id).first(); if not member_role: raise HTTPException(status_code=404, detail="Member role not found")` |
| 406-415 | `old_permissions = {"role": member_role.role, "can_create_channels": member_role.can_create_channels, "can_send_messages": member_role.can_send_messages, "can_delete_messages": member_role.can_delete_messages, "can_manage_roles": member_role.can_manage_roles, "can_kick_members": member_role.can_kick_members, "can_make_announcement": member_role.can_make_announcement, "can_manage_tasks": member_role.can_manage_tasks}` |
| 417-424 | `member_role.role = data.role; member_role.can_create_channels = data.can_create_channels; member_role.can_send_messages = data.can_send_messages; member_role.can_delete_messages = data.can_delete_messages; member_role.can_manage_roles = data.can_manage_roles; member_role.can_kick_members = data.can_kick_members; member_role.can_make_announcement=data.can_make_announcement; member_role.can_manage_tasks=data.can_manage_tasks` |
| 426-427 | `db.commit(); db.refresh(member_role)` |
| 429-438 | `new_permissions = {"role": member_role.role, "can_create_channels": member_role.can_create_channels, "can_send_messages": member_role.can_send_messages, "can_delete_messages": member_role.can_delete_messages, "can_manage_roles": member_role.can_manage_roles, "can_kick_members": member_role.can_kick_members, "can_make_announcement": member_role.can_make_announcement, "can_manage_tasks": member_role.can_manage_tasks}` |
| 440 | `changes = {k: {"from": old_permissions[k], "to": new_permissions[k]} for k in old_permissions if old_permissions[k] != new_permissions[k]}` |
| 442-443 | `target_user = db.query(Users).filter(Users.user_id == member_user_id).first(); member_name = f"{target_user.first_name} {target_user.last_name}" if target_user else str(member_user_id)` |
| 445 | `create_log(db, org_id=team.org_id, actor_id=user_id, action="team_member_permissions_updated", target_id=member_user_id, target_type="user", metadata={"team_id": team_id, "team_name": team.team_name, "role": member_role.role, "member_name": member_name, "changes": changes})` |
| 447-461 | `return {"message": "Member permissions updated successfully", "user_id": member_user_id, "team_id": team_id, "role": member_role.role, "permissions": {"can_create_channels": member_role.can_create_channels, "can_send_messages": member_role.can_send_messages, "can_delete_messages": member_role.can_delete_messages, "can_manage_roles": member_role.can_manage_roles, "can_kick_members": member_role.can_kick_members, "can_make_announcement": member_role.can_make_announcement, "can_manage_tasks": member_role.can_manage_tasks}}` |

### `kick_member_service` (lines 463-529)
| Line | Code |
|------|------|
| 464 | `user_id = user.user_id` |
| 466-469 | `team = db.query(Teams).filter(Teams.team_id == team_id).first(); if not team: raise HTTPException(status_code=404, detail="Team not found")` |
| 471-474 | `found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 476 | `is_owner = found_organization.owner_id == user_id` |
| 479-484 | `user_role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == user_id).first(); has_kick_permission = user_role and user_role.can_kick_members if user_role else False` |
| 486-490 | `if not is_owner and not has_kick_permission: raise HTTPException(status_code=403, detail="You don't have permission to kick members from this team")` |
| 492 | `target_is_owner = found_organization.owner_id == member_user_id` |
| 495-499 | `if target_is_owner: raise HTTPException(status_code=403, detail="Cannot kick organization owner")` |
| 502-508 | `target_member = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == member_user_id).first(); if not target_member: raise HTTPException(status_code=404, detail="User is not a member of this team")` |
| 510-516 | `member_role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == member_user_id).first(); kicked_user = db.query(Users).filter(Users.user_id == member_user_id).first(); kicked_name = f"{kicked_user.first_name} {kicked_user.last_name}" if kicked_user else str(member_user_id); create_log(db, org_id=found_organization.organization_id, actor_id=user_id, action="team_member_kicked", target_id=member_user_id, target_type="user", metadata={"team_id": team_id, "team_name": team.team_name, "member_name": kicked_name})` |
| 519-523 | `if member_role: db.delete(member_role); db.delete(target_member); db.commit()` |
| 525-529 | `return {"message": "Member kicked successfully", "user_id": member_user_id, "team_id": team_id}` |

### `fetch_user_team_service` (lines 531-550)
| Line | Code |
|------|------|
| 533 | `user_id = user.user_id` |
| 535-539 | `results = db.query(Teams).join(Team_association, Teams.team_id == Team_association.team_id).filter(Team_association.user_id == user_id).all()` |
| 541-550 | `return [{"team_id": team.team_id, "team_name": team.team_name, "description": team.description, "org_id": team.org_id, "created_at": team.created_at} for team in results]` |

### `create_channels_for_teams_service` (lines 552-626)
| Line | Code |
|------|------|
| 554 | `user_id = user.user_id` |
| 556-559 | `team = db.query(Teams).filter(Teams.team_id == team_id).first(); if not team: raise HTTPException(status_code=404, detail="Team not found")` |
| 561-562 | `if team.org_id != org_id: raise HTTPException(status_code=400, detail="Team does not belong to this organization")` |
| 564-567 | `found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 569-576 | `is_owner = found_organization.owner_id == user_id; user_role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == user_id).first(); has_permission = is_owner or (user_role and user_role.can_create_channels)` |
| 578-582 | `if not has_permission: raise HTTPException(status_code=403, detail="You don't have permission to create channels in this team")` |
| 584-590 | `existing_channel = db.query(Channels).filter(Channels.team_id == team_id, Channels.channel_name == data.channel_name).first(); if existing_channel: raise HTTPException(status_code=400, detail="Channel name already exists in this team")` |
| 592-599 | `channel_limit = get_channel_limit(found_organization.organization_plan); if channel_limit is not None: current_count = db.query(Channels).filter(Channels.org_id == org_id).count(); if current_count >= channel_limit: raise HTTPException(status_code=403, detail=f"Free plan allows a maximum of {channel_limit} channels. Upgrade to Pro for unlimited channels.")` |
| 601-608 | `new_channel = Channels(channel_name=data.channel_name, channel_mode=data.channel_mode, channel_category=data.channel_category, description=data.description, team_id=team_id, org_id=org_id)` |
| 610-612 | `db.add(new_channel); db.commit(); db.refresh(new_channel)` |
| 614 | `create_log(db, org_id=org_id, actor_id=user_id, action="channel_created", target_id=new_channel.channel_id, target_type="channel", metadata={"channel_name": new_channel.channel_name, "team_id": team_id, "team_name": team.team_name})` |
| 616-626 | `return {"message": "Channel created successfully", "channel_id": new_channel.channel_id, "channel_name": new_channel.channel_name, "channel_mode": new_channel.channel_mode, "channel_category": new_channel.channel_category, "description": new_channel.description, "team_id": new_channel.team_id, "org_id": new_channel.org_id, "created_at": new_channel.created_at}` |

### `fetch_channels_for_teams_service` (lines 628-677)
| Line | Code |
|------|------|
| 630 | `user_id = user.user_id` |
| 632-635 | `team = db.query(Teams).filter(Teams.team_id == team_id).first(); if not team: raise HTTPException(status_code=404, detail="Team not found")` |
| 637-638 | `if team.org_id != org_id: raise HTTPException(status_code=400, detail="Team does not belong to this organization")` |
| 640-643 | `found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 645-661 | `is_owner = found_organization.owner_id == user_id; is_org_member = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id).first(); is_team_member = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == user_id).first(); if not is_owner and not is_org_member and not is_team_member: raise HTTPException(status_code=403, detail="You don't have access to view channels in this team")` |
| 663 | `channels = db.query(Channels).filter(Channels.team_id == team_id).all()` |
| 665-677 | `return [{"channel_id": channel.channel_id, "channel_name": channel.channel_name, "channel_mode": channel.channel_mode, "channel_category": channel.channel_category, "description": channel.description, "team_id": channel.team_id, "org_id": channel.org_id, "created_at": channel.created_at} for channel in channels]` |

### `fetch_members_info` (lines 679-754)
| Line | Code |
|------|------|
| 680 | `user_id = user.user_id` |
| 682-685 | `found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 687-690 | `team = db.query(Teams).filter(Teams.team_id == team_id).first(); if not team: raise HTTPException(status_code=404, detail="Team not found")` |
| 692-693 | `if team.org_id != org_id: raise HTTPException(status_code=400, detail="Team does not belong to this organization")` |
| 695-708 | `is_owner = found_organization.owner_id == user_id; is_org_member = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first(); is_team_member = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == user_id).first(); if not is_owner and not is_org_member and not is_team_member: raise HTTPException(status_code=403, detail="you are not allowed")` |
| 711-714 | `target_user = db.query(Users).filter(Users.user_id == target_user_id).first(); if not target_user: raise HTTPException(status_code=404, detail="User not found")` |
| 716-722 | `target_membership = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == target_user_id).first(); if not target_membership: raise HTTPException(status_code=404, detail="User is not a member of this team")` |
| 724-727 | `target_role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == target_user_id).first()` |
| 729-754 | `return {"user": {"user_id": target_user.user_id, "first_name": target_user.first_name, "last_name": target_user.last_name, "email": target_user.email, "avatar_url": target_user.avatar_url, "user_tag": target_user.user_tag, "phone_number": target_user.phone_number, "country": target_user.country}, "organization_id": org_id, "team": {"team_id": team.team_id, "team_name": team.team_name, "role": target_role.role if target_role else "MEMBER", "permissions": {"can_create_channels": target_role.can_create_channels if target_role else False, "can_send_messages": target_role.can_send_messages if target_role else False, "can_delete_messages": target_role.can_delete_messages if target_role else False, "can_manage_roles": target_role.can_manage_roles if target_role else False, "can_kick_members": target_role.can_kick_members if target_role else False, "can_make_announcement": target_role.can_make_announcement if target_role else False}}}` |

### `revoke_permissions_from_team_memebers` (lines 757-846)
| Line | Code |
|------|------|
| 758-759 | `requester_user_id = user.user_id; target_user_id = int(target_user_id)` |
| 761-763 | `team = db.query(Teams).filter(Teams.team_id == team_id).first(); if not team: raise HTTPException(status_code=404, detail="Team not found")` |
| 765-767 | `found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 769-782 | `is_owner = found_organization.owner_id == requester_user_id; requester_role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == requester_user_id).first(); has_manage_permission = requester_role.can_manage_roles if requester_role else False; if not is_owner and not has_manage_permission: raise HTTPException(status_code=403, detail="Only organization owner or members with manage roles permission can revoke permissions")` |
| 784-790 | `target_member = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == target_user_id).first(); if not target_member: raise HTTPException(status_code=404, detail="User is not a member of this team")` |
| 792-793 | `if found_organization.owner_id == target_user_id: raise HTTPException(status_code=403, detail="Cannot revoke permissions from organization owner")` |
| 795-801 | `target_role = db.query(Team_roles).filter(Team_roles.team_id == team_id, Team_roles.user_id == target_user_id).first(); if not target_role: raise HTTPException(status_code=404, detail="Member role not found")` |
| 803-810 | `permission_fields = {"can_create_channels", "can_send_messages", "can_delete_messages", "can_manage_roles", "can_kick_members", "can_make_announcement"}` |
| 812-823 | `if permission_name: if permission_name not in permission_fields: raise HTTPException(status_code=400, detail="Invalid permission name"); setattr(target_role, permission_name, False); else: target_role.role = "MEMBER"; target_role.can_create_channels = False; target_role.can_send_messages = False; target_role.can_delete_messages = False; target_role.can_manage_roles = False; target_role.can_kick_members = False; target_role.can_make_announcement = False` |
| 825-826 | `db.commit(); db.refresh(target_role)` |
| 828-829 | `target_user = db.query(Users).filter(Users.user_id == target_user_id).first(); member_name = f"{target_user.first_name} {target_user.last_name}" if target_user else str(target_user_id)` |
| 831 | `create_log(db, org_id=found_organization.organization_id, actor_id=requester_user_id, action="team_member_permissions_revoked", target_id=target_user_id, target_type="user", metadata={"team_id": team_id, "team_name": team.team_name, "member_name": member_name, "permission": permission_name if permission_name else "all"})` |
| 833-846 | `return {"message": "Member permissions revoked successfully", "user_id": target_user_id, "team_id": team_id, "role": target_role.role, "permissions": {"can_create_channels": target_role.can_create_channels, "can_send_messages": target_role.can_send_messages, "can_delete_messages": target_role.can_delete_messages, "can_manage_roles": target_role.can_manage_roles, "can_kick_members": target_role.can_kick_members, "can_make_announcement": target_role.can_make_announcement}}` |

### `fetch_files_for_team_channel_service` (lines 848-920)
| Line | Code |
|------|------|
| 855 | `user_id = user.user_id` |
| 857-859 | `team = db.query(Teams).filter(Teams.team_id == team_id).first(); if not team: raise HTTPException(status_code=404, detail="Team not found")` |
| 861-862 | `if team.org_id != org_id: raise HTTPException(status_code=400, detail="Team does not belong to this organization")` |
| 864-871 | `channel = db.query(Channels).filter(Channels.channel_id == channel_id, Channels.org_id == org_id, Channels.team_id == team_id).first(); if not channel: raise HTTPException(status_code=404, detail="Team channel not found")` |
| 873-875 | `found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 877-889 | `is_owner = found_organization.owner_id == user_id; is_org_admin = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first(); is_team_member = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == user_id).first(); if not is_owner and not is_org_admin and not is_team_member: raise HTTPException(status_code=403, detail="You don't have access to this team channel")` |
| 891-897 | `files = db.query(Files, Users).join(Users, Files.sender_id == Users.user_id).filter(Files.team_id == team_id, Files.channel_id == channel_id, Files.is_deleted == False).order_by(Files.sent_at.asc()).all()` |
| 899-920 | `return {"org_id": org_id, "team_id": team_id, "channel_id": channel_id, "files": [{"id": file_record.id, "file_name": file_record.file_name, "file_url": file_record.file_url, "file_size": file_record.file_size, "sent_at": file_record.sent_at, "sender": {"user_id": sender.user_id, "first_name": sender.first_name, "last_name": sender.last_name, "avatar_url": sender.avatar_url, "user_tag": sender.user_tag}} for file_record, sender in files]}` |

### `view_pdf` (lines 923-1001)
| Line | Code |
|------|------|
| 924 | `user_id = user.user_id` |
| 926-928 | `team = db.query(Teams).filter(Teams.team_id == team_id).first(); if not team: raise HTTPException(status_code=404, detail="Team not found")` |
| 930-931 | `if team.org_id != org_id: raise HTTPException(status_code=400, detail="Team does not belong to this organization")` |
| 933-935 | `found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not found_organization: raise HTTPException(status_code=404, detail="Organization not found")` |
| 937-949 | `is_owner = found_organization.owner_id == user_id; is_org_admin = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first(); is_team_member = db.query(Team_association).filter(Team_association.team_id == team_id, Team_association.user_id == user_id).first(); if not is_owner and not is_org_admin and not is_team_member: raise HTTPException(status_code=403, detail="You don't have access to this file")` |
| 951-958 | `file = db.query(Files).filter(Files.id == file_id, Files.team_id == team_id, Files.is_deleted == False).first(); if not file: raise HTTPException(status_code=404, detail="File not found")` |
| 960-961 | `import os; from urllib.parse import quote` |
| 963-964 | `if os.path.splitext(file.file_name)[1].lower() != ".pdf": raise HTTPException(status_code=400, detail="Only PDF files can be viewed inline")` |
| 966-976 | `client = httpx.Client(timeout=30.0, follow_redirects=True); try: upstream = client.stream("GET", file.file_url).__enter__(); except httpx.HTTPError: client.close(); raise HTTPException(status_code=502, detail="Failed to fetch file from storage"); if upstream.status_code != 200: upstream.close(); client.close(); raise HTTPException(status_code=502, detail="Failed to fetch file from storage")` |
| 978 | `content_length = upstream.headers.get("content-length")` |
| 980-986 | `def iterator(): try: for chunk in upstream.iter_bytes(chunk_size=64 * 1024): yield chunk; finally: upstream.close(); client.close()` |
| 988-996 | `quoted_file_name = quote(file.file_name); safe_file_name = file.file_name.replace('"', ""); response_headers = {"Content-Disposition": f'inline; filename="{safe_file_name}"; filename*=UTF-8\'\'{quoted_file_name}', "X-Content-Type-Options": "nosniff"}; if content_length: response_headers["Content-Length"] = content_length` |
| 997-1001 | `return StreamingResponse(iterator(), media_type="application/pdf", headers=response_headers)` |
