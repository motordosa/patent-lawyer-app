from fastapi import APIRouter, HTTPException
from models.project import ProjectCreate, ProjectUpdate
from services.db_service import (
    get_all_projects, get_project, create_project, update_project_status, delete_project
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/")
async def list_projects():
    return await get_all_projects()


@router.post("/")
async def create_new_project(body: ProjectCreate):
    project = await create_project(body.title, body.description, body.technology_field)
    return project


@router.get("/{project_id}")
async def get_single_project(project_id: int):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}")
async def update_project(project_id: int, body: ProjectUpdate):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if body.status:
        await update_project_status(project_id, body.status)
    return await get_project(project_id)


@router.delete("/{project_id}")
async def remove_project(project_id: int):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await delete_project(project_id)
    return {"message": f"Project {project_id} deleted", "title": project["title"]}
