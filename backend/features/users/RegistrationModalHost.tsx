"use client";

import { useEffect } from "react";
import { useModal } from "../../../src/components/modal/useModal";
import UserFormModal from "./modals/UserFormModal";
import { USERS_CHANGED_EVENT } from "./constants/events";

export default function RegistrationModalHost() {
  const { openModal } = useModal();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const registerButton = event.target.closest(
        "button[data-open-registration]",
      );
      if (!registerButton) return;
      event.preventDefault();
      openModal(UserFormModal, {
        isRegistration: true,
        onSaved: async () => {
          window.dispatchEvent(new Event(USERS_CHANGED_EVENT));
        },
      });
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openModal]);

  return null;
}
