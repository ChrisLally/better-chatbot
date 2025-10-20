"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import { Database } from "@/types/supabase";
import { getUsers } from "@/services/supabase/users-service";

type User = Database["public"]["Tables"]["users"]["Row"];

interface UsersState {
  users: User[];
  loading: boolean;
  error: string | null;
}

type UsersAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_USERS"; payload: User[] };

const initialState: UsersState = {
  users: [],
  loading: false,
  error: null,
};

function usersReducer(state: UsersState, action: UsersAction): UsersState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_USERS":
      return { ...state, users: action.payload, loading: false, error: null };
    default:
      return state;
  }
}

interface UsersContextType {
  state: UsersState;
  dispatch: React.Dispatch<UsersAction>;
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

interface UsersProviderProps {
  children: ReactNode;
}

export function UsersProvider({ children }: UsersProviderProps) {
  const [state, dispatch] = useReducer(usersReducer, initialState);

  const refreshUsers = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const users = await getUsers();
      dispatch({ type: "SET_USERS", payload: users });
    } catch (error) {
      console.error("Error refreshing users:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to refresh users",
      });
    }
  };

  // Load initial data
  useEffect(() => {
    refreshUsers();
  }, []);

  const value: UsersContextType = {
    state,
    dispatch,
    refreshUsers,
  };

  return (
    <UsersContext.Provider value={value}>{children}</UsersContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error("useUsers must be used within a UsersProvider");
  }
  return context;
}
