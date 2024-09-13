interface Bank {
    name: string;
    logoUrl: string;
}

export const banks: Bank[] = [
    {
        name: 'Bank of Scotland',
        logoUrl: 'https://play-lh.googleusercontent.com/Xd3lZwxOpoI5EFRihkOgtC_FmUz9D7NkQHlTWG7YlMA5CEcTi4aUIH-BCjFcgVp3EFU=s48',
    },
    {
        name: 'First Direct',
        logoUrl:'https://play-lh.googleusercontent.com/xl45stTOae2Mz8HB99pYwZmYeNOUZimch0pX2CIsz2hkXbI2DbLkVP-J_jUb5ktCWhU=s48',
    },
    {
        name: 'Natwest',
        logoUrl: 'https://play-lh.googleusercontent.com/1yX6eldsO2xi_8REM0fwZ7JHpT9tGcSvv0_waTK2nXIX7nZMYUpe35asAt3HOnFRV1w=w240-h480',
    },
    {
        name: 'TSB',
        logoUrl: 'https://play-lh.googleusercontent.com/Fnb9khSD4FEl08o7Qse7Kw73_EbWKT36vwcBqJfdjewepuX1qeMn7JxQA957XXyyP5M=w240-h480',
    },
];

export default banks;
