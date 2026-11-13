"use client";
import { createContext, useContext } from "react";

const Ctx = createContext(null);
export const SessionProvider = ({ user, children }) => <Ctx.Provider value={user}>{children}</Ctx.Provider>;
export const useUser = () => useContext(Ctx);
