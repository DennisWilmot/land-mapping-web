"use client";

import { useState, useEffect, useCallback } from "react";
import type { SavedSelection } from "../types/saved-selection";

const STORAGE_KEY = "land-mapping-saved-selections";

/**
 * Generate a UUID for saved selections
 */
function generateId(): string {
  return crypto.randomUUID?.() || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Custom hook for managing saved parcel selections with localStorage persistence
 */
export function useSavedSelections() {
  const [selections, setSelections] = useState<SavedSelection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedSelection[];
        setSelections(parsed);
      }
    } catch (error) {
      console.error("Failed to load saved selections:", error);
    }
    setIsLoaded(true);
  }, []);

  // Persist to localStorage whenever selections change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
      } catch (error) {
        console.error("Failed to save selections:", error);
      }
    }
  }, [selections, isLoaded]);

  /**
   * Save a new selection
   */
  const saveSelection = useCallback((name: string, parcelIds: number[]): SavedSelection => {
    const now = Date.now();
    const newSelection: SavedSelection = {
      id: generateId(),
      name: name.trim() || `Selection ${selections.length + 1}`,
      parcelIds,
      createdAt: now,
      updatedAt: now,
    };
    
    setSelections(prev => [...prev, newSelection]);
    return newSelection;
  }, [selections.length]);

  /**
   * Update an existing selection's parcel list
   */
  const updateSelection = useCallback((id: string, parcelIds: number[]): void => {
    setSelections(prev => 
      prev.map(sel => 
        sel.id === id 
          ? { ...sel, parcelIds, updatedAt: Date.now() }
          : sel
      )
    );
  }, []);

  /**
   * Rename a selection
   */
  const renameSelection = useCallback((id: string, newName: string): void => {
    setSelections(prev => 
      prev.map(sel => 
        sel.id === id 
          ? { ...sel, name: newName.trim() || sel.name, updatedAt: Date.now() }
          : sel
      )
    );
  }, []);

  /**
   * Delete a selection
   */
  const deleteSelection = useCallback((id: string): void => {
    setSelections(prev => prev.filter(sel => sel.id !== id));
  }, []);

  /**
   * Get a selection by ID
   */
  const getSelection = useCallback((id: string): SavedSelection | undefined => {
    return selections.find(sel => sel.id === id);
  }, [selections]);

  return {
    selections,
    isLoaded,
    saveSelection,
    updateSelection,
    renameSelection,
    deleteSelection,
    getSelection,
  };
}
