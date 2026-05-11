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
      adminReply
      adminReplyAt
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
      adminReply
      adminReplyAt
    }
  }
`;

export const REPLY_TO_ADVICE = gql`
  mutation ReplyToAvis($aviId: String!, $reply: String!) {
    replyToAvis(aviId: $aviId, reply: $reply) {
      id
      adminReply
      adminReplyAt
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
      category
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
      category
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
    $shippingCarrier: String
    $trackingNumber: String
  ) {
    updateReservationAdmin(
      reservationId: $reservationId
      status: $status
      paymentStatus: $paymentStatus
      shippingCarrier: $shippingCarrier
      trackingNumber: $trackingNumber
    ) {
      id
      status
      paymentStatus
      shippingCarrier
      trackingNumber
    }
  }
`;

export const SUBMIT_RESERVATION_TO_ADMIN = gql`
  mutation SubmitReservationToAdmin(
    $reservationId: ID!
    $customerPhone: String!
    $customerAddress: String!
    $paymentMethod: String!
    $pickupDate: String
    $pickupTime: String
  ) {
    submitReservationToAdmin(
      reservationId: $reservationId
      customerPhone: $customerPhone
      customerAddress: $customerAddress
      paymentMethod: $paymentMethod
      pickupDate: $pickupDate
      pickupTime: $pickupTime
    ) {
      id
      status
      customerPhone
      customerAddress
      paymentMethod
      pickupDate
      pickupTime
      paymentStatus
    }
  }
`;

export const CREATE_STRIPE_CHECKOUT_SESSION = gql`
  mutation CreateStripeCheckoutSession(
    $reservationId: ID!
    $customerPhone: String!
    $customerAddress: String!
    $deliveryMethod: String
    $pickupDate: String
    $pickupTime: String
    $relayName: String
    $relayAddress: String
    $frontendUrl: String
  ) {
    createStripeCheckoutSession(
      reservationId: $reservationId
      customerPhone: $customerPhone
      customerAddress: $customerAddress
      deliveryMethod: $deliveryMethod
      pickupDate: $pickupDate
      pickupTime: $pickupTime
      relayName: $relayName
      relayAddress: $relayAddress
      frontendUrl: $frontendUrl
    ) {
      url
    }
  }
`;

export const CONFIRM_STRIPE_CHECKOUT_SESSION = gql`
  mutation ConfirmStripeCheckoutSession($sessionId: String!) {
    confirmStripeCheckoutSession(sessionId: $sessionId) {
      id
      status
      paymentMethod
      paymentStatus
      customerPhone
      customerAddress
      deliveryMethod
      pickupDate
      pickupTime
      relayName
      relayAddress
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

export const CONFIRM_RESERVATION_RECEIVED = gql`
  mutation ConfirmReservationReceived($reservationId: ID!) {
    confirmReservationReceived(reservationId: $reservationId) {
      id
      status
    }
  }
`;

export const DELETE_TREATED_RESERVATION_ADMIN = gql`
  mutation DeleteTreatedReservationAdmin($reservationId: ID!) {
    deleteTreatedReservationAdmin(reservationId: $reservationId)
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

export const SEND_PLATFORM_MESSAGE_TO_CLIENT = gql`
  mutation SendPlatformMessageToClient($clientEmail: String!, $message: String!) {
    sendPlatformMessageToClient(clientEmail: $clientEmail, message: $message) {
      id
      message
      senderRole
      createdAt
      readAt
      client {
        email
        firstname
        lastname
      }
    }
  }
`;

export const SEND_PLATFORM_MESSAGE_TO_ADMIN = gql`
  mutation SendPlatformMessageToAdmin($message: String!) {
    sendPlatformMessageToAdmin(message: $message) {
      id
      message
      senderRole
      createdAt
      readAt
      client {
        email
        firstname
        lastname
      }
    }
  }
`;

export const MARK_MY_CLIENT_MESSAGES_AS_READ = gql`
  mutation MarkMyClientMessagesAsRead {
    markMyClientMessagesAsRead
  }
`;

export const MARK_CLIENT_CONVERSATION_AS_READ = gql`
  mutation MarkClientConversationAsRead($clientEmail: String!) {
    markClientConversationAsRead(clientEmail: $clientEmail)
  }
`;
