import { useEffect, useState } from "react";

import { User } from "../types/Bagel";
import { isTauri } from "../utils/tauri";

type UserEditPanelProps = {
    user: User | null;
    updateOrAddUser: (newUser: User) => void;
    deleteUser: (userID: string) => void;
    onClose: ((userID: string, userEmail: string) => void) | null;
    close: () => void;
    existingUsers?: User[] | null;
};

function UserEditPanel({
    user,
    updateOrAddUser,
    deleteUser,
    onClose,
    close,
    existingUsers,
}: UserEditPanelProps) {

    const emptyUser: User = {
        id: crypto.randomUUID(),
        name: '',
        email: '',
        icon: './Serenity/unknown.png',
    };

    const [ephemeralUser, setEphemeralUser] = useState<User>({
        id: user ? user.id : emptyUser.id,
        name: user ? user.name : emptyUser.name,
        email: user ? user.email : emptyUser.email,
        icon: user ? user.icon : emptyUser.icon,
    });

    useEffect(() => {
        if (user) {
            setEphemeralUser({
                ...user,
            });
        }
        else {
            setEphemeralUser({
                id: emptyUser.id,
                name: emptyUser.name,
                email: emptyUser.email,
                icon: emptyUser.icon,
            });
        }
    }, [user]);

    const icons = [
        './Serenity/bagel.png',
        './Serenity/nim.png',
        // './Serenity/paun.png',
        // './Serenity/andreas.png',
        './Serenity/mochyn.png',
        './Serenity/hwyaden.png',
        // './Serenity/trex.png',
    ]

    const invalidName = (
        // non-nulls
        ephemeralUser.name.trim() === ''
        // unique
        || existingUsers?.some((existingUser) => existingUser.name === ephemeralUser.name && existingUser.id !== ephemeralUser.id)
    );
    const invalidEmail = (
        // non-nulls
        ephemeralUser.email.trim() === ''
        // email format (basic check)
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ephemeralUser.email)
    ) && isTauri; // email only needs to be valid in Tauri context

    const invalidForm = invalidName || invalidEmail;

    return (
        <div className='column'>

            <div className='row'>
                {
                    icons.map((icon, index) => (
                        <img
                            key={index}
                            className={`clickable ${ephemeralUser.icon !== icon ? 'unselected' : ''}`}
                            src={icon}
                            alt={`User Icon ${index + 1}`}
                            onClick={() => setEphemeralUser({ ...ephemeralUser, icon })}
                        />
                    ))
                }
            </div>

            <div className='formRow'>
                <input
                    className={`${invalidName ? 'invalid' : ''}`}
                    type='text'
                    placeholder='User Name'
                    value={ephemeralUser.name}
                    onChange={(e) => setEphemeralUser({ ...ephemeralUser, name: e.target.value })}
                    autoFocus
                />
            </div>

            {isTauri &&
                <div className='formRow'>
                    <input
                        className={`${invalidEmail ? 'invalid' : ''}`}
                        type='text'
                        placeholder='Email Address'
                        value={ephemeralUser.email}
                        onChange={(e) => setEphemeralUser({ ...ephemeralUser, email: e.target.value })}
                    />
                </div>
            }

            <div className='row'>
                <button
                    className='centre'
                    onClick={() => {
                        updateOrAddUser(ephemeralUser);
                        close();
                        if (onClose !== null && onClose !== undefined) {
                            onClose(ephemeralUser.id, ephemeralUser.email);
                        }
                    }}
                    disabled={invalidForm}
                >
                    {user ? 'Update' : 'Add'}
                </button>
                {user !== null && (
                    <button
                        className='centre threat'
                        onClick={() => {
                            deleteUser(user?.id);
                            close();
                        }}
                    >
                        Delete
                    </button>
                )}
            </div>

            <div className='footend small'>
                {isTauri &&
                    <p>
                        TrueLayer requires your email to identify you when linking your bank.
                        This is only used for verification and never shared.
                    </p>
                }
            </div>
        </div>
    );
}

export default UserEditPanel;
