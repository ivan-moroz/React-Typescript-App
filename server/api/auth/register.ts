import type { NextApiRequest, NextApiResponse } from "next";
import { TLSSocket } from "node:tls";

import { ERROR_MESSAGES } from "../../../constants/errors";
import { hashPassword } from "../../../server/auth/password";
import { sessionCookie } from "../../../server/auth/session";
import prisma from "../../../server/db/prisma";

type RegistrationPayload = {
  name: string;
  email: string;
  age: number;
  city: string;
  password: string;
};

type RegisterResponse =
  | { id: number; name: string; email: string }
  | { message: string };

function isValidRegistration(payload: Partial<RegistrationPayload>): payload is RegistrationPayload {
  return (
    typeof payload.name === "string" &&
    payload.name.trim().length > 0 &&
    typeof payload.email === "string" &&
    payload.email.trim().length > 0 &&
    typeof payload.age === "number" &&
    Number.isInteger(payload.age) &&
    payload.age > 0 &&
    typeof payload.city === "string" &&
    payload.city.trim().length > 0 &&
    typeof payload.password === "string" &&
    payload.password.length > 0
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterResponse>,
) {
  if (req.method !== "POST") {
    res.status(405).json({ message: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
    return;
  }

  if (!isValidRegistration(req.body ?? {})) {
    res.status(400).json({ message: ERROR_MESSAGES.INVALID_PAYLOAD });
    return;
  }

  try {
    const lastUser = await prisma.user.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const user = await prisma.user.create({
      data: {
        name: req.body.name.trim(),
        email: req.body.email.trim(),
        age: req.body.age,
        city: req.body.city.trim(),
        passwordHash: await hashPassword(req.body.password),
        position: (lastUser?.position ?? -1) + 1,
      },
      select: { id: true, name: true, email: true, passwordHash: true },
    });

    const secure =
      (req.socket instanceof TLSSocket && req.socket.encrypted) ||
      req.headers["x-forwarded-proto"] === "https";
    res.setHeader("Set-Cookie", sessionCookie(user, secure));
    res.status(201).json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      res.status(409).json({ message: ERROR_MESSAGES.EMAIL_IN_USE });
      return;
    }

    res.status(500).json({ message: ERROR_MESSAGES.USER_ADD_FAILED });
  }
}
