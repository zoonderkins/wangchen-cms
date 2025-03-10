// Display links page
exports.links = async (req, res) => {
    try {
        const language = req.language || 'en';
        const pageTitle = language === 'tw' ? '相關連結' : 'Related Links';

        // Get active links ordered by display order
        const links = await prisma.link.findMany({
            where: {
                active: true
            },
            orderBy: {
                order: 'asc'
            }
        });

        res.render('frontend/links', {
            title: pageTitle,
            links,
            currentLanguage: language
        });
    } catch (error) {
        console.error('Error loading links:', error);
        res.status(500).render('frontend/error', {
            title: language === 'en' ? 'Error' : '錯誤',
            message: language === 'en' ? 'Failed to load links' : '載入相關連結失敗',
            currentLanguage: language
        });
    }
}; 