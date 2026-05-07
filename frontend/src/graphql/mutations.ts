import { gql } from "@apollo/client";

export const ADD_CONTACT = gql`
  mutation AddContact(
    $name: String!
    $lastname: String!
    $email: String!
    $message: String!
  ) {
    addContact(
      name: $name
      lastname: $lastname
      email: $email
      message: $message
    ) {
      id
      name
      lastname
      email
      message
    }
  }
`;

export const ADD_ADVICE = gql`
  mutation AddAvis(
    $name: String!
    $lastname: String!
    $message: String!
    $imgUrl: String!
    $rating: Int!
    $title: String!
  ) {
    addAvis(
      name: $name
      lastname: $lastname
      message: $message
      imgUrl: $imgUrl
      rating: $rating
      title: $title
    ) {
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

export const DELETE_AVIS = gql`
  mutation deleteAvis($aviId: String!) {
    deleteAvis(aviId: $aviId)
  }
`;

export const CREATE_NEW_AVIS = gql`
  mutation CreateNewAvis($data: NewAvisInput!) {
    createNewAvis(data: $data) {
      id
      name
      lastname
      title
      message
      rating
      imgUrl
    }
  }
`;

export const CREATE_NEW_PRODUCT = gql`
  mutation CreateNewProduct($data: NewProductInput!) {
    createNewProduct(data: $data) {
      id
      name
      imgUrl
      price
      description
    }
  }
`;

export const CREATE_NEW_ARTICLE = gql`
  mutation CreateNewArticle($data: NewArticleInput!) {
    createNewArticle(data: $data) {
      id
      product {
        id
        name
      }
    }
  }
`;

export const CREATE_NEW_USER = gql`
  mutation CreateNewUser(
    $email: String!
    $password: String!
    $firstname: String!
    $lastname: String!
    $phone: String
    $address: String
    $avatarUrl: String
  ) {
    createUser(
      email: $email
      password: $password
      firstname: $firstname
      lastname: $lastname
      phone: $phone
      address: $address
      avatarUrl: $avatarUrl
    )
  }
`;

export const CREATE_ADMIN = gql`
  mutation CreateAdmin(
    $email: String!
    $password: String!
    $firstname: String!
    $lastname: String!
    $adminCode: String
  ) {
    createAdmin(
      email: $email
      password: $password
      firstname: $firstname
      lastname: $lastname
      adminCode: $adminCode
    )
  }
`;

export const DELETE_PRODUCT = gql`
  mutation DeleteProduct($deleteProductId: ID!) {
    deleteProduct(id: $deleteProductId)
  }
`;
export const EDIT_PRODUCT = gql`
  mutation EditProduct($data: NewProductInput!, $productId: ID!) {
    editProduct(data: $data, productId: $productId) {
      price
      name
      imgUrl
      id
      description
    }
  }
`;

export const SET_PRODUCT_STOCK = gql`
  mutation SetProductStock($productId: ID!, $quantity: Float!) {
    setProductStock(productId: $productId, quantity: $quantity) {
      id
      articles {
        id
      }
    }
  }
`;

export const UPDATE_RESERVATION_STATUS = gql`
  mutation UpdateReservationStatus($reservationId: ID!) {
    updateReservationStatus(reservationId: $reservationId) {
      id
      status
      startDate
      endDate
    }
  }
`;

export const UPDATE_RESERVATION_ADMIN = gql`
  mutation UpdateReservationAdmin(
    $reservationId: ID!
    $status: String!
    $paymentStatus: String!
  ) {
    updateReservationAdmin(
      reservationId: $reservationId
      status: $status
      paymentStatus: $paymentStatus
    ) {
      id
      status
      paymentStatus
    }
  }
`;

export const SUBMIT_RESERVATION_TO_ADMIN = gql`
  mutation SubmitReservationToAdmin(
    $reservationId: ID!
    $customerPhone: String!
    $customerAddress: String!
    $paymentMethod: String!
  ) {
    submitReservationToAdmin(
      reservationId: $reservationId
      customerPhone: $customerPhone
      customerAddress: $customerAddress
      paymentMethod: $paymentMethod
    ) {
      id
      status
      customerPhone
      customerAddress
      paymentMethod
      paymentStatus
    }
  }
`;

export const CANCEL_RESERVATION = gql`
  mutation CancelReservation($reservationId: ID!) {
    cancelReservation(reservationId: $reservationId) {
      id
      status
    }
  }
`;

export const DELETE_ARTICLE = gql`
  mutation DeleteArticle($deleteArticleId: ID!) {
    deleteArticle(id: $deleteArticleId)
  }
`;

export const DELETE_ARTICLE_FROM_RESERVATION = gql`
  mutation DeleteArticleFromReservation($id: ID!) {
    deleteArticleFromReservation(articleId: $id) {
      id
    }
  }
`;

export const HANDLE_RESERVATION = gql`
  mutation HandleReservation($data: NewReservationInput!) {
    handleReservation(data: $data) {
      id
    }
  }
`;
