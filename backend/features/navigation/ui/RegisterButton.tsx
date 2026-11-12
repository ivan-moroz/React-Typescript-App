"use client";

import { useRouter } from "next/navigation";
import { useModal } from "../../../shared/ui/modal/useModal";
import UserFormModal from "../../users/ui/modals/UserFormModal";

export default function RegisterButton() {
  const router = useRouter();
  const { openModal } = useModal();

  return (
    <button
      className="register-button"
      type="button"
      onClick={() =>
        openModal(UserFormModal, {
          isRegistration: true,
          onSaved: async () => router.refresh(),
        })
      }
    >
      Register
    </button>
  );
}
