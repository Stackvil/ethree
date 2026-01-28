export interface Ride {
    id: string;
    _id?: string;
    name: string;
    price: number;
    image?: string;
    description?: string;
}

export const rides: Ride[] = [
    {
        id: '1',
        name: 'Balloon Shooting',
        price: 100,
        description: 'Aim and fire to win prizes.',
        image: 'baloon shooting/IMG_8435.jpg'
    },
    {
        id: '2',
        name: 'Bouncy',
        price: 100,
        description: 'Safe inflatable fun for kids.',
        image: 'bouncy/WhatsApp_Image_2025-06-14_at_4.02.45_PM.jpeg'
    },
    {
        id: '3',
        name: 'Bull Ride',
        price: 100,
        description: 'Test your strength and balance.',
        image: 'bull ride/IMG_8384.jpg'
    },
    {
        id: '4',
        name: 'Bumping Cars Double',
        price: 150,
        description: 'Classic favorite for two players.',
        image: 'bumping cars double/Bumper_Cars_9944_14762891777.jpg'
    },
    {
        id: '5',
        name: 'Bumping Cars Single',
        price: 100,
        description: 'Fun-filled solo driving experience.',
        image: 'bumping cars single/IMG_8417.jpg'
    },
    {
        id: '6',
        name: 'Columbus Mini',
        price: 100,
        description: 'Mini swinging adventure boat.',
        image: 'columbus mini/IMG_8407.jpg'
    },
    {
        id: '7',
        name: 'Free Fall',
        price: 100,
        description: 'Thrilling vertical drop experience.',
        image: 'free fall/IMG_8381.jpg'
    },
    {
        id: '8',
        name: 'Joker Ride',
        price: 100,
        description: 'Fun and laughter on this kid-friendly ride.',
        image: 'joker ride/IMG_8400.jpg'
    },
    {
        id: '9',
        name: 'Paddle Boat',
        price: 100,
        description: 'Relaxing water adventure.',
        image: 'paddle boat/paddle-boat.webp'
    },
    {
        id: '10',
        name: 'Soft Play',
        price: 100,
        description: 'Colorful indoor play area for toddlers.',
        image: 'soft play/WhatsApp_Image_2025-06-14_at_4.04.52_PM_1.jpeg'
    },
    {
        id: '11',
        name: 'Sun & Moon',
        price: 100,
        description: 'Magical rotating sky adventure.',
        image: 'sun & moon/IMG_8389.jpg'
    },
    {
        id: '12',
        name: 'Kids Train',
        price: 100,
        description: 'A delightful journey for the little ones.',
        image: 'train ticket/IMG_8410.jpg'
    },
    {
        id: '13',
        name: 'Trampoline',
        price: 100,
        description: 'Bounce away all your energy.',
        image: 'trampoline/trampoline.webp'
    },
    {
        id: '14',
        name: '360 Cycle',
        price: 150,
        description: 'Thrilling 360-degree cycling experience.',
        image: '360 cycle/360-degree-cycle-500x500.webp'
    },
    {
        id: '15',
        name: 'Basket Ball',
        price: 100,
        description: 'Shoot hoops and win scores.',
        image: 'basket ball/images.jpg'
    },
    {
        id: '16',
        name: 'Bungee Jump',
        price: 150,
        description: 'Bungee jumping trampoline for kids.',
        image: 'Bungee jump/bungee-jumping-trampoline.jpeg'
    },
    {
        id: '17',
        name: 'Free Ride',
        price: 0,
        description: 'Complimentary ride experience.',
        image: 'free ride/images (1).jpg'
    },
    {
        id: '18',
        name: 'Mini Wheel Ride',
        price: 100,
        description: 'Small ferris wheel for younger kids.',
        image: 'mini wheel ride/1.avif'
    },
    {
        id: '19',
        name: 'Combo Adult (5 Rides)',
        price: 500,
        description: '5 Rides for Adults.',
        image: 'combo adult/E4LOGO.jpeg'
    },
    {
        id: '20',
        name: 'Combo Child (5 Rides)',
        price: 400,
        description: '5 Rides for Children.',
        image: 'combo child/E4LOGO.jpeg'
    },
    {
        id: '21',
        name: 'Ticket Summary Pas (5 Rides)',
        price: 500,
        description: 'Special Pass: Any 5 rides of your choice!',
        image: 'E4LOGO.jpeg'
    }
];
