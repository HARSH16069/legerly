import { authProxy } from "@/lib/authproxy"
export const maxDuration = 60;
export const POST = (req) => authProxy(req, "/auth/login");