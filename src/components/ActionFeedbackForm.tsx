"use client";

import { ReactNode, useEffect } from "react";
import { useFormState } from "react-dom";
import { toast } from "react-toastify";

type ActionState = {
  success: boolean;
  error: boolean;
  message?: string;
};

const initialState: ActionState = {
  success: false,
  error: false,
};

const ActionFeedbackForm = ({
  action,
  children,
  className,
  errorMessage = "Something went wrong!",
  id,
  successMessage,
}: {
  action: (data: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  errorMessage?: string;
  id?: string;
  successMessage: string;
}) => {
  const [state, formAction] = useFormState(
    async (_currentState: ActionState, data: FormData) => action(data),
    initialState
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || successMessage);
    }

    if (state.error) {
      toast.error(state.message || errorMessage);
    }
  }, [errorMessage, state, successMessage]);

  return (
    <form action={formAction} className={className} id={id}>
      {children}
    </form>
  );
};

export default ActionFeedbackForm;
