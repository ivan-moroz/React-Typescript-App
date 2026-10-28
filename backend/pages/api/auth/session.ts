import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "../../../lib/session";
import { ERROR_MESSAGES } from "../../../../src/constants/errors";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ message: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
    return;
  }
  try {
    res.status(200).json(await getSessionUser(req));
  } catch {
    res.status(500).json({ message: ERROR_MESSAGES.REQUEST_FAILED });
  }
}
