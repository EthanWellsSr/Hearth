# Deliver as a responsive PWA, not a native app

The app is a responsive web app, installed on phones as a PWA (Progressive Web
App — a website added to the home screen that opens full-screen like an app),
not a native iOS app. This serves both required targets — iPhone and Mac — from
one codebase and one deploy, with instant updates and no App Store review.
Native (e.g. React Native + App Store) was rejected because it roughly doubles
the work and adds a review/release cycle; the only thing given up is deep iOS
hardware access, which a household dashboard does not need.
