"use client";

import { useState, useEffect, useRef } from "react";
import type { SavedProject } from "@/lib/types/project";

interface SideNavProps {
  savedProjects: SavedProject[];
  activeProjectId: string | null;
  onLoadProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
}

const NAV_STORAGE_KEY = "land-mapping-nav-expanded";

// Icons
function LogoIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// Format date for display
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Project Item Component
function ProjectItem({
  project,
  isActive,
  isExpanded,
  onLoad,
  onRename,
  onDelete,
}: {
  project: SavedProject;
  isActive: boolean;
  isExpanded: boolean;
  onLoad: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveRename = () => {
    if (editName.trim() && editName.trim() !== project.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  if (!isExpanded) {
    // Collapsed: just show a dot indicator for active
    return null;
  }

  return (
    <div
      className={`group rounded-lg p-2.5 transition-all cursor-pointer ${
        isActive
          ? "bg-purple-600/20 border border-purple-500/50"
          : "bg-slate-800/50 border border-transparent hover:bg-slate-700/50 hover:border-slate-600"
      }`}
      onClick={() => !isEditing && onLoad()}
    >
      {isEditing ? (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRename();
              if (e.key === "Escape") {
                setEditName(project.name);
                setIsEditing(false);
              }
            }}
            onBlur={handleSaveRename}
            className="flex-1 px-2 py-1 text-sm bg-slate-900 border border-purple-500 rounded text-white focus:outline-none"
          />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
              )}
              <span className="text-sm text-white font-medium truncate">
                {project.name}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {project.parcelIds.length} parcels · {formatDate(project.updatedAt)}
            </div>
          </div>
          
          {/* Action buttons - show on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 hover:bg-slate-600 rounded transition-colors"
              title="Rename"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete project "${project.name}"?`)) {
                  onDelete();
                }
              }}
              className="p-1 hover:bg-red-600/20 rounded transition-colors"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Nav Item Button (for collapsed state)
function NavButton({
  icon,
  label,
  badge,
  isActive,
  isExpanded,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  isActive?: boolean;
  isExpanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-3 w-full p-3 rounded-lg transition-all group ${
        isActive
          ? "bg-purple-600/20 text-purple-400"
          : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
      }`}
      title={!isExpanded ? label : undefined}
    >
      <div className="flex-shrink-0">{icon}</div>
      {isExpanded && (
        <span className="text-sm font-medium">{label}</span>
      )}
      {badge !== undefined && badge > 0 && (
        <span className={`absolute ${isExpanded ? 'right-3' : 'top-1 right-1'} min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-purple-500 text-white rounded-full`}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      
      {/* Tooltip for collapsed state */}
      {!isExpanded && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
          {label}
        </div>
      )}
    </button>
  );
}

export default function SideNav({
  savedProjects,
  activeProjectId,
  onLoadProject,
  onRenameProject,
  onDeleteProject,
}: SideNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<"projects" | null>(null);

  // Load preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(NAV_STORAGE_KEY);
    if (stored === "true") {
      setIsExpanded(true);
      setActiveSection("projects");
    }
  }, []);

  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem(NAV_STORAGE_KEY, String(isExpanded));
  }, [isExpanded]);

  const handleToggle = () => {
    if (isExpanded) {
      setIsExpanded(false);
      setActiveSection(null);
    } else {
      setIsExpanded(true);
      setActiveSection("projects");
    }
  };

  const handleProjectsClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setActiveSection("projects");
    } else if (activeSection === "projects") {
      setIsExpanded(false);
      setActiveSection(null);
    } else {
      setActiveSection("projects");
    }
  };

  return (
    <>
      {/* Overlay backdrop for mobile when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Navigation Rail */}
      <div
        className={`fixed left-0 top-0 h-full z-50 flex flex-col glass-panel border-r border-slate-700/50 transition-all duration-300 ease-in-out ${
          isExpanded ? "w-72" : "w-14"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center ${isExpanded ? "justify-between" : "justify-center"} p-3 border-b border-slate-700/50`}>
          {isExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <div className="text-teal-400">
                  <LogoIcon />
                </div>
                <span className="text-sm font-semibold text-white">Land Mapping</span>
              </div>
              <button
                onClick={handleToggle}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                title="Collapse"
              >
                <ChevronLeftIcon />
              </button>
            </>
          ) : (
            <button
              onClick={handleToggle}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-teal-400"
              title="Expand"
            >
              <LogoIcon />
            </button>
          )}
        </div>

        {/* Main Navigation */}
        <div className="flex-1 flex flex-col p-2 overflow-hidden">
          {/* Projects Button */}
          <NavButton
            icon={<ProjectsIcon />}
            label="Projects"
            badge={savedProjects.length}
            isActive={activeSection === "projects"}
            isExpanded={isExpanded}
            onClick={handleProjectsClick}
          />

          {/* Projects List (when expanded and section is active) */}
          {isExpanded && activeSection === "projects" && (
            <div className="mt-2 flex-1 overflow-y-auto scrollbar-thin">
              {savedProjects.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6 px-3">
                  <p>No projects yet</p>
                  <p className="mt-1 text-slate-600">
                    Select parcels and save as a project
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {savedProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={activeProjectId === project.id}
                      isExpanded={isExpanded}
                      onLoad={() => onLoadProject(project.id)}
                      onRename={(name) => onRenameProject(project.id, name)}
                      onDelete={() => onDeleteProject(project.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Future items */}
        <div className="p-2 border-t border-slate-700/50">
          <NavButton
            icon={<AccountIcon />}
            label="Account"
            isExpanded={isExpanded}
            onClick={() => {/* Future: open account */}}
          />
          <NavButton
            icon={<SettingsIcon />}
            label="Settings"
            isExpanded={isExpanded}
            onClick={() => {/* Future: open settings */}}
          />
        </div>
      </div>
    </>
  );
}
