"use client";

import { useState, useEffect, useCallback } from "react";
import type { SavedProject } from "../types/project";

const STORAGE_KEY = "land-mapping-saved-projects";

/**
 * Generate a UUID for saved projects
 */
function generateId(): string {
  return crypto.randomUUID?.() || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Custom hook for managing saved parcel projects with localStorage persistence
 */
export function useProjects() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedProject[];
        setProjects(parsed);
      }
    } catch (error) {
      console.error("Failed to load saved projects:", error);
    }
    setIsLoaded(true);
  }, []);

  // Persist to localStorage whenever projects change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      } catch (error) {
        console.error("Failed to save projects:", error);
      }
    }
  }, [projects, isLoaded]);

  /**
   * Save a new project
   */
  const saveProject = useCallback((name: string, parcelIds: number[]): SavedProject => {
    const now = Date.now();
    const newProject: SavedProject = {
      id: generateId(),
      name: name.trim() || `Project ${projects.length + 1}`,
      parcelIds,
      createdAt: now,
      updatedAt: now,
    };
    
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, [projects.length]);

  /**
   * Update an existing project's parcel list
   */
  const updateProject = useCallback((id: string, parcelIds: number[]): void => {
    setProjects(prev => 
      prev.map(proj => 
        proj.id === id 
          ? { ...proj, parcelIds, updatedAt: Date.now() }
          : proj
      )
    );
  }, []);

  /**
   * Rename a project
   */
  const renameProject = useCallback((id: string, newName: string): void => {
    setProjects(prev => 
      prev.map(proj => 
        proj.id === id 
          ? { ...proj, name: newName.trim() || proj.name, updatedAt: Date.now() }
          : proj
      )
    );
  }, []);

  /**
   * Delete a project
   */
  const deleteProject = useCallback((id: string): void => {
    setProjects(prev => prev.filter(proj => proj.id !== id));
  }, []);

  /**
   * Get a project by ID
   */
  const getProject = useCallback((id: string): SavedProject | undefined => {
    return projects.find(proj => proj.id === id);
  }, [projects]);

  return {
    projects,
    isLoaded,
    saveProject,
    updateProject,
    renameProject,
    deleteProject,
    getProject,
  };
}
