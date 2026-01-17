import { User } from "src/types/Bagel";
import { isTauri } from "../utils/tauri";
import { isEmptyString } from "./utils";

export function validateUser(
    user: User,
    existingUsers?: User[] | null,
): Record<string, boolean> {
    const errors: Record<string, boolean> = {};

    const { id, name, email, } = user;

    // BASIC VALIDATION
    errors.invalidName = (
        isEmptyString(name)
        // unique
        || (existingUsers?.some(u => u.name === name && u.id !== id) ?? false)
    );
    errors.invalidEmail = (
        isEmptyString(email)
        // email format (basic check)
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) && isTauri; // email only needs to be valid in Tauri context

    // FORM
    errors.invalidForm = (
        errors.invalidName
        || errors.invalidEmail
    );

    return errors;
}
