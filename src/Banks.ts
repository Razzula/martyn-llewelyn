interface Bank {
    name: string;
    nameFull?: string;
    url?: string;
    logoUrl: string;
}

export const banks: Bank[] = [
    {
        name: 'Bank of Scotland',
        url: 'https://www.bankofscotland.co.uk/',
        logoUrl: 'https://play-lh.googleusercontent.com/Xd3lZwxOpoI5EFRihkOgtC_FmUz9D7NkQHlTWG7YlMA5CEcTi4aUIH-BCjFcgVp3EFU=s48',
    },
    {
        name: 'Co-op',
        nameFull:'Co-operative Bank',
        url: 'https://www.co-operativebank.co.uk/',
        logoUrl: 'https://play-lh.googleusercontent.com/jSHpWJ8vUQC18f9aadQw3a6EI4AEWYbEnFZ7yB8oX3Ta1FroHiNM3u4uEANMyYVsVYU=w240-h480',
    },
    {
        name: 'First Direct',
        url: 'https://www.firstdirect.com/',
        logoUrl:'https://play-lh.googleusercontent.com/xl45stTOae2Mz8HB99pYwZmYeNOUZimch0pX2CIsz2hkXbI2DbLkVP-J_jUb5ktCWhU=s48',
    },
    {
        name: 'Halifax',
        url: 'https://www.halifax.co.uk/',
        logoUrl: 'https://play-lh.googleusercontent.com/gnwz03bfeirJCBbFXqUP87qEeJd8nc4HGmEVCNsxVVoRsT4BesuVrCZSVk256F_TTQ=w240-h480',
    },
    {
        name: 'HSBC',
        url: 'https://www.hsbc.co.uk/',
        logoUrl: 'https://play-lh.googleusercontent.com/fB0pmbrZ-cn4XKc6D173bAt0Ft2UiZ8_bza15sjY5S-2u2OXshSFarjXoflSSzuPow=w240-h480',
    },
    {
        name: 'Kingdom Bank',
        url: 'https://www.kingdom.bank/',
        logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSG8wBz02HkTR4-1nlzx45_yI0YItjOylxXFw&s',
    },
    {
        name: 'Lloyds', nameFull: 'Lloyds Bank',
        url: 'https://www.lloydsbank.com/',
        logoUrl: 'https://play-lh.googleusercontent.com/Vx5qgVYRW8Q_dF1pA7cW5cW3qEioDuVFZyRm0mcn8PPMLnWATcV7Q5FzkwJlere6bh9H=s48',
    },
    {
        name: 'Nationwide',
        url: 'https://www.nationwide.co.uk/',
        logoUrl: 'https://play-lh.googleusercontent.com/pOWNb4Hcl5juzwW1RdodrtdTEXRwmqIokIJAVLyVqGJ2Se7mL-qgB_e5mx2wCH-tf8s=w240-h480',
    },
    {
        name: 'NatWest',
        url: 'https://www.NatWest.com/',
        logoUrl: 'https://play-lh.googleusercontent.com/1yX6eldsO2xi_8REM0fwZ7JHpT9tGcSvv0_waTK2nXIX7nZMYUpe35asAt3HOnFRV1w=w240-h480',
    },
    {
        name: 'RBS', nameFull: 'Royal Bank of Scotland',
        url: 'https://www.rbs.co.uk/',
        logoUrl: 'https://play-lh.googleusercontent.com/7zbVp2quorkXYcY7XrGo1F2NBI6WTWH_XK0Rpr_ZwirW56QWtT6wYZpWIWhMgsLGZoI=w240-h480',
    },
    {
        name: 'Saffron BS', nameFull: 'Saffron Building Society',
        url: 'https://www.saffronbs.co.uk/',
        logoUrl: 'https://play-lh.googleusercontent.com/nynzoEu25oHYBnzIGM4FGAgePjDF2rrXqtBV_v3THfQPM0FXCflu2CNbIR-RYKCqrLo=s48',
    },
    {
        name: 'Santander',
        url: 'https://www.santander.co.uk/',
        logoUrl: 'https://play-lh.googleusercontent.com/sG0NHfFUJLcD7YhpZCw6OWgScMQFwvm5Ku64a-UQFXgyIk_qNW4VAtq1yQkuPl0MRG8=w240-h480',
    },
    {
        name: 'Skipton BS', nameFull: 'Skipton Building Society',
        url: 'https://www.skipton.co.uk/',
        logoUrl: 'https://play-lh.googleusercontent.com/VXJkJccwEKiuebvRr52UD5gQ-CrLyT9AwUAwJ_XGfo-TTIcjr5259vHwDqXtHD-nIdI=w240-h480',
    },
    {
        name: 'TSB',
        url: 'https://www.tsb.co.uk/',
        logoUrl: 'https://play-lh.googleusercontent.com/Fnb9khSD4FEl08o7Qse7Kw73_EbWKT36vwcBqJfdjewepuX1qeMn7JxQA957XXyyP5M=w240-h480',
    },
    {
        name: 'Yorkshire BS', nameFull: 'Yorkshire Building Society',
        url: 'https://www.ybs.co.uk/',
        logoUrl: 'https://play-lh.googleusercontent.com/zUUoBYVQInG-oLJdBuwmB3zhnMDMhEJpct3dPU3lTCoNLG9i45KsFZTxtn9NH6PzJg=s48',
    },

    { name: 'Your', nameFull: 'Misc.', logoUrl: './serenity.png' },
];

export default banks;
