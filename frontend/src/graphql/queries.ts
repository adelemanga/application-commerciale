import { gql } from "@apollo/client";

export const GET_ALL_CONTACTS = gql`
  query GetAllContacts {
    getAllContacts {
      id
      name
      lastname
      email
      message
    }
  }
`;

export const GET_ALL_ADVICES = gql`
  query GetAllAdvices {
    getAllAvis {
      id
      name
      lastname
      message
      imgUrl
      rating
      title
    }
  }
`;


export const GET_ALL_PRODUCTS = gql`
  query GetAllProducts {
    getAllProducts {
      id
      name
      description
      imgUrl
      price
      category
      articles {
        id
      }
    }
  }
`;

export const GET_ALL_ARTICLES = gql`
  query GetAllArticles {
    getAllArticles {
      id
      reservations {
        id
      }
      product {
        id
        name
      }
    }
  }
`;

export const GET_PRODUCT_BY_ID = gql`
  query GetOneProductById($productId: ID!) {
    getOneProductById(productId: $productId) {
      id
      name
      description
      imgUrl
      price
      category
      articles {
        id
      }
    }
  }
`;

export const GET_JWT = gql`
  query Login($password: String!, $email: String!) {
    login(password: $password, email: $email)
  }
`;

export const LOGIN_CLIENT = gql`
  query LoginClient($password: String!, $email: String!) {
    loginClient(password: $password, email: $email)
  }
`;

export const LOGIN_ADMIN = gql`
  query LoginAdmin($password: String!, $email: String!) {
    loginAdmin(password: $password, email: $email)
  }
`;

export const WHO_AM_I = gql`
  query WhoAmI {
    whoAmI {
      email
      firstname
      lastname
      phone
      address
      avatarUrl
      isLoggedIn
      role
    }
  }
`;

export const LOGOUT = gql`
  query Logout {
    logout
  }
`;

export const GET_RESERVATIONS_BY_USER_ID = gql`
  query GetReservationsByUserId {
    getReservationsByUserId {
      reservation {
        id
        startDate
        endDate
        createdAt
        status
        paymentMethod
        paymentStatus
        stripeSessionId
        pickupDate
        pickupTime
        deliveryMethod
        relayName
        relayAddress
        customerPhone
        customerAddress
        shippingCarrier
        trackingNumber
        articles {
          id
          product {
            id
            name
            price
            imgUrl
          }
        }
      }
      totalPrice
    }
  }
`;

export const SEARCH_AND_FILTER_PRODUCTS = gql`
  query SearchAndFilterProducts(
    $dateRangeInput: ProductDateRangeInput
    $keyword: String
  ) {
    searchAndFilterProducts(
      dateRangeInput: $dateRangeInput
      keyword: $keyword
    ) {
      id
      name
      description
      price
      imgUrl
    }
  }
`;

export const GET_CURRENT_RESERVATION_BY_USER_ID = gql`
  query GetCurrentReservationByUserId {
    getCurrentReservationByUserId {
      reservation {
        status
        startDate
        endDate
        id
        createdAt
        customerPhone
        customerAddress
        paymentMethod
        paymentStatus
        pickupDate
        pickupTime
        deliveryMethod
        relayName
        relayAddress
        shippingCarrier
        trackingNumber
        articles {
          id
          product {
            id
            name
            price
            imgUrl
          }
        }
      }
      totalPrice
    }
  }
`;

export const GET_RESERVATIONS_BY_ARTICLE_ID = gql`
  query GetReservationsByArticleId($articleId: ID!) {
    getReservationsByArticleId(articleId: $articleId) {
      id
      articles {
        id
        product {
          name
        }
      }
      startDate
      endDate
      createdAt
      status
      user {
        email
      }
    }
  }
`;

export const GET_ALL_RESERVATIONS = gql`
  query GetAllReservations {
    getAllReservations {
      id
      startDate
      endDate
      createdAt
      status
      customerPhone
      customerAddress
      paymentMethod
      paymentStatus
      stripeSessionId
      pickupDate
      pickupTime
      deliveryMethod
      relayName
      relayAddress
      shippingCarrier
      trackingNumber
      user {
        email
        firstname
        lastname
        phone
        address
      }
      articles {
        id
        product {
          id
          name
          price
          imgUrl
        }
      }
    }
  }
`;
